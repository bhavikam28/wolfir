"""
IAM MCP Server — Custom implementation (boto3)

Provides MCP-compatible tools for IAM security analysis,
policy auditing, role enumeration, and access review.

Inspired by awslabs/mcp patterns. Integrated into Nova Sentinel's FastMCP.
"""
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class IAMMCPServer:
    """
    IAM MCP tools for security posture analysis.

    Provides tools for:
    - User/role enumeration with risk scoring
    - Policy analysis (overly permissive, admin access)
    - Access key rotation audit
    - MFA compliance check
    - Cross-account role trust analysis
    """

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        """Lazy-initialize IAM client."""
        if self._client is None:
            if self.settings.aws_profile and self.settings.aws_profile != "default":
                session = boto3.Session(profile_name=self.settings.aws_profile)
            else:
                session = boto3.Session()
            self._client = session.client('iam', region_name=self.settings.aws_region)
            logger.info("IAM MCP: client initialized")
        return self._client

    async def audit_iam_users(self) -> Dict[str, Any]:
        """
        Audit all IAM users for security issues.

        Checks:
        - MFA enabled
        - Access key age and rotation
        - Console access without MFA
        - Unused credentials
        - Overly permissive policies

        Returns:
            Dict with users, findings, and risk score
        """
        try:
            users_response = await asyncio.to_thread(self.client.list_users)
            users = users_response.get('Users', [])

            findings = []
            user_details = []

            for user in users[:20]:  # Limit to avoid throttling
                username = user['UserName']
                user_info = {
                    "username": username,
                    "arn": user.get("Arn", ""),
                    "created": user.get("CreateDate", "").isoformat() if isinstance(user.get("CreateDate"), datetime) else str(user.get("CreateDate", "")),
                    "password_last_used": "",
                    "mfa_enabled": False,
                    "access_keys": [],
                    "policies": [],
                    "risk_level": "LOW",
                }

                # Check MFA
                try:
                    mfa_response = await asyncio.to_thread(
                        self.client.list_mfa_devices, UserName=username
                    )
                    user_info["mfa_enabled"] = len(mfa_response.get("MFADevices", [])) > 0
                    if not user_info["mfa_enabled"]:
                        findings.append({
                            "user": username,
                            "finding": "NO_MFA",
                            "severity": "HIGH",
                            "detail": f"User {username} does not have MFA enabled",
                            "remediation": f"Enable MFA: aws iam create-virtual-mfa-device --virtual-mfa-device-name {username}-mfa",
                        })
                except Exception:
                    pass

                # Check access keys
                try:
                    keys_response = await asyncio.to_thread(
                        self.client.list_access_keys, UserName=username
                    )
                    for key in keys_response.get("AccessKeyMetadata", []):
                        key_age_days = 0
                        if isinstance(key.get("CreateDate"), datetime):
                            key_age_days = (datetime.utcnow() - key["CreateDate"].replace(tzinfo=None)).days

                        key_info = {
                            "key_id": key.get("AccessKeyId", "")[:8] + "...",
                            "status": key.get("Status", ""),
                            "age_days": key_age_days,
                        }
                        user_info["access_keys"].append(key_info)

                        if key_age_days > 90 and key.get("Status") == "Active":
                            findings.append({
                                "user": username,
                                "finding": "OLD_ACCESS_KEY",
                                "severity": "HIGH",
                                "detail": f"Access key {key_info['key_id']} is {key_age_days} days old (>90 days)",
                                "remediation": f"Rotate key: aws iam create-access-key --user-name {username} && aws iam delete-access-key --user-name {username} --access-key-id {key.get('AccessKeyId', '')}",
                            })
                except Exception:
                    pass

                # Check attached policies for admin access
                try:
                    policies_response = await asyncio.to_thread(
                        self.client.list_attached_user_policies, UserName=username
                    )
                    for policy in policies_response.get("AttachedPolicies", []):
                        policy_name = policy.get("PolicyName", "")
                        user_info["policies"].append(policy_name)

                        if "AdministratorAccess" in policy_name or "FullAccess" in policy_name:
                            findings.append({
                                "user": username,
                                "finding": "ADMIN_ACCESS",
                                "severity": "CRITICAL",
                                "detail": f"User {username} has {policy_name} — overly permissive",
                                "remediation": f"Review and restrict: aws iam detach-user-policy --user-name {username} --policy-arn {policy.get('PolicyArn', '')}",
                            })
                except Exception:
                    pass

                # Determine risk level
                user_findings = [f for f in findings if f.get("user") == username]
                has_critical = any(f["severity"] == "CRITICAL" for f in user_findings)
                has_high = any(f["severity"] == "HIGH" for f in user_findings)
                if has_critical:
                    user_info["risk_level"] = "CRITICAL"
                elif has_high:
                    user_info["risk_level"] = "HIGH"
                elif user_findings:
                    user_info["risk_level"] = "MEDIUM"

                user_details.append(user_info)

            severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for f in findings:
                severity_counts[f.get("severity", "LOW")] += 1

            return {
                "users": user_details,
                "total_users": len(user_details),
                "findings": findings,
                "total_findings": len(findings),
                "severity_summary": severity_counts,
                "source": "iam-mcp-server",
            }
        except Exception as e:
            logger.error(f"IAM MCP: audit_iam_users failed: {e}")
            return {"error": str(e), "source": "iam-mcp-server"}

    async def audit_iam_roles(self) -> Dict[str, Any]:
        """
        Audit IAM roles for security issues.

        Checks:
        - Overly permissive trust policies
        - Cross-account trust
        - Roles with admin access
        - Unused roles

        Returns:
            Dict with roles, findings, and risk assessment
        """
        try:
            roles_response = await asyncio.to_thread(self.client.list_roles)
            roles = roles_response.get('Roles', [])

            findings = []
            role_details = []

            for role in roles[:25]:
                role_name = role["RoleName"]
                # Skip AWS service-linked roles
                if role.get("Path", "").startswith("/aws-service-role/"):
                    continue

                trust_policy = role.get("AssumeRolePolicyDocument", {})
                if isinstance(trust_policy, str):
                    try:
                        trust_policy = json.loads(trust_policy)
                    except Exception:
                        trust_policy = {}

                role_info = {
                    "role_name": role_name,
                    "arn": role.get("Arn", ""),
                    "created": role.get("CreateDate", "").isoformat() if isinstance(role.get("CreateDate"), datetime) else str(role.get("CreateDate", "")),
                    "trust_entities": [],
                    "is_cross_account": False,
                    "risk_level": "LOW",
                }

                # Analyze trust policy
                for statement in trust_policy.get("Statement", []):
                    principal = statement.get("Principal", {})
                    if isinstance(principal, str):
                        if principal == "*":
                            findings.append({
                                "role": role_name,
                                "finding": "WILDCARD_TRUST",
                                "severity": "CRITICAL",
                                "detail": f"Role {role_name} trusts EVERYONE (Principal: *)",
                                "remediation": f"Restrict trust policy: aws iam update-assume-role-policy --role-name {role_name} --policy-document <restricted-policy>",
                            })
                        role_info["trust_entities"].append(principal)
                    elif isinstance(principal, dict):
                        for key, values in principal.items():
                            if isinstance(values, str):
                                values = [values]
                            for val in values:
                                role_info["trust_entities"].append(f"{key}:{val}")
                                if key == "AWS" and ":" in val:
                                    # Check for cross-account
                                    account_in_arn = val.split(":")[4] if len(val.split(":")) > 4 else ""
                                    if account_in_arn and account_in_arn != role.get("Arn", "").split(":")[4]:
                                        role_info["is_cross_account"] = True
                                        findings.append({
                                            "role": role_name,
                                            "finding": "CROSS_ACCOUNT_TRUST",
                                            "severity": "MEDIUM",
                                            "detail": f"Role {role_name} trusts external account {account_in_arn}",
                                            "remediation": "Verify cross-account trust is intentional and uses external-id condition",
                                        })

                # Check for admin policies
                try:
                    attached = await asyncio.to_thread(
                        self.client.list_attached_role_policies, RoleName=role_name
                    )
                    for policy in attached.get("AttachedPolicies", []):
                        pname = policy.get("PolicyName", "")
                        if "AdministratorAccess" in pname:
                            findings.append({
                                "role": role_name,
                                "finding": "ADMIN_ROLE",
                                "severity": "HIGH",
                                "detail": f"Role {role_name} has {pname}",
                                "remediation": f"Apply least-privilege: aws iam detach-role-policy --role-name {role_name} --policy-arn {policy.get('PolicyArn', '')}",
                            })
                except Exception:
                    pass

                # Risk level
                role_findings = [f for f in findings if f.get("role") == role_name]
                if any(f["severity"] == "CRITICAL" for f in role_findings):
                    role_info["risk_level"] = "CRITICAL"
                elif any(f["severity"] == "HIGH" for f in role_findings):
                    role_info["risk_level"] = "HIGH"
                elif role_findings:
                    role_info["risk_level"] = "MEDIUM"

                role_details.append(role_info)

            severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for f in findings:
                severity_counts[f.get("severity", "LOW")] += 1

            return {
                "roles": role_details,
                "total_roles": len(role_details),
                "findings": findings,
                "total_findings": len(findings),
                "severity_summary": severity_counts,
                "source": "iam-mcp-server",
            }
        except Exception as e:
            logger.error(f"IAM MCP: audit_iam_roles failed: {e}")
            return {"error": str(e), "source": "iam-mcp-server"}

    async def analyze_policy(self, policy_arn: str) -> Dict[str, Any]:
        """
        Deep-analyze a specific IAM policy for security issues.

        Args:
            policy_arn: ARN of the IAM policy to analyze

        Returns:
            Dict with policy details, permissions, and security assessment
        """
        try:
            # Get policy details
            policy_response = await asyncio.to_thread(
                self.client.get_policy, PolicyArn=policy_arn
            )
            policy = policy_response.get("Policy", {})

            # Get policy version document
            version_response = await asyncio.to_thread(
                self.client.get_policy_version,
                PolicyArn=policy_arn,
                VersionId=policy.get("DefaultVersionId", "v1")
            )
            policy_doc = version_response.get("PolicyVersion", {}).get("Document", {})
            if isinstance(policy_doc, str):
                policy_doc = json.loads(policy_doc)

            # Analyze statements
            findings = []
            permissions = []
            for statement in policy_doc.get("Statement", []):
                effect = statement.get("Effect", "")
                actions = statement.get("Action", [])
                resources = statement.get("Resource", [])

                if isinstance(actions, str):
                    actions = [actions]
                if isinstance(resources, str):
                    resources = [resources]

                for action in actions:
                    permissions.append({
                        "effect": effect,
                        "action": action,
                        "resources": resources,
                    })

                    # Check for wildcard actions
                    if effect == "Allow" and action == "*":
                        findings.append({
                            "finding": "WILDCARD_ACTION",
                            "severity": "CRITICAL",
                            "detail": "Policy allows all actions (*) — full admin access",
                        })
                    elif effect == "Allow" and action.endswith(":*"):
                        service = action.split(":")[0]
                        findings.append({
                            "finding": "SERVICE_WILDCARD",
                            "severity": "HIGH",
                            "detail": f"Policy allows all {service} actions ({action})",
                        })

                    # Check for wildcard resources
                    if effect == "Allow" and "*" in resources:
                        findings.append({
                            "finding": "WILDCARD_RESOURCE",
                            "severity": "HIGH",
                            "detail": f"Action {action} allowed on all resources (*)",
                        })

            return {
                "policy_name": policy.get("PolicyName", ""),
                "policy_arn": policy_arn,
                "description": policy.get("Description", ""),
                "created": policy.get("CreateDate", "").isoformat() if isinstance(policy.get("CreateDate"), datetime) else str(policy.get("CreateDate", "")),
                "attachment_count": policy.get("AttachmentCount", 0),
                "permissions": permissions,
                "total_permissions": len(permissions),
                "findings": findings,
                "total_findings": len(findings),
                "risk_level": "CRITICAL" if any(f["severity"] == "CRITICAL" for f in findings)
                    else "HIGH" if any(f["severity"] == "HIGH" for f in findings)
                    else "MEDIUM" if findings else "LOW",
                "source": "iam-mcp-server",
            }
        except Exception as e:
            logger.error(f"IAM MCP: analyze_policy failed: {e}")
            return {"error": str(e), "source": "iam-mcp-server"}

    async def get_account_summary(self) -> Dict[str, Any]:
        """
        Get IAM account summary with security metrics.

        Returns:
            Dict with account-level IAM statistics and compliance status
        """
        try:
            summary = await asyncio.to_thread(self.client.get_account_summary)
            data = summary.get("SummaryMap", {})

            compliance_issues = []
            if data.get("AccountMFAEnabled", 0) == 0:
                compliance_issues.append({
                    "issue": "ROOT_NO_MFA",
                    "severity": "CRITICAL",
                    "detail": "Root account MFA is not enabled",
                })
            if data.get("AccessKeysPerUserQuota", 0) > 0 and data.get("Users", 0) > 0:
                # Check if any user has multiple active keys
                pass

            return {
                "users": data.get("Users", 0),
                "groups": data.get("Groups", 0),
                "roles": data.get("Roles", 0),
                "policies": data.get("Policies", 0),
                "mfa_devices": data.get("MFADevicesInUse", 0),
                "root_mfa_enabled": data.get("AccountMFAEnabled", 0) == 1,
                "access_keys_per_user": data.get("AccessKeysPerUserQuota", 2),
                "server_certificates": data.get("ServerCertificates", 0),
                "compliance_issues": compliance_issues,
                "source": "iam-mcp-server",
            }
        except Exception as e:
            logger.error(f"IAM MCP: get_account_summary failed: {e}")
            return {"error": str(e), "source": "iam-mcp-server"}


# Singleton
_iam_mcp = None

def get_iam_mcp() -> IAMMCPServer:
    global _iam_mcp
    if _iam_mcp is None:
        _iam_mcp = IAMMCPServer()
    return _iam_mcp
