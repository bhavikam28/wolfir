"""
Remediation Executor — Executes safe remediation actions via AWS APIs.

SAFETY MODEL:
- Level 1 (AUTO): Tag QUARANTINE, attach DENY policy, disable access key
- Level 2 (APPROVAL): Detach policies, stop instance, modify SG
- Level 3 (MANUAL): Delete role, VPC changes

For demo_mode=true: returns pre-cached proof without calling AWS.
"""
import json
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional
from datetime import datetime

from utils.logger import logger

DEMO_CLOUDTRAIL = {
    "eventName": "PutRolePolicy",
    "eventTime": datetime.utcnow().isoformat() + "Z",
    "sourceIPAddress": "wolfir.internal",
    "userAgent": "wolfir/1.0",
    "requestParameters": {"roleName": "CompromisedRole", "policyName": "wolfir-EmergencyDeny"},
}


@dataclass
class ExecutionResult:
    action_type: str
    status: str  # SUCCESS | FAILED | ROLLED_BACK
    resource_arn: str
    before_state: dict
    after_state: dict
    rollback_command: str
    cloudtrail_event: dict
    execution_timestamp: str
    executed_by: str  # WOLFIR-AUTO | HUMAN-APPROVED
    incident_id: str
    step_id: Optional[str] = None


class RemediationExecutor:
    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode
        self._client = None

    def _get_iam(self):
        if self._client is None and not self.demo_mode:
            import boto3
            self._client = boto3.client("iam")
        return self._client

    async def execute_quarantine_tag(
        self, resource_arn: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        tags = {
            "WOLFIR-QUARANTINE": "true",
            "QUARANTINE-TIMESTAMP": datetime.utcnow().isoformat(),
            "QUARANTINE-INCIDENT": incident_id,
        }
        if self.demo_mode:
            return ExecutionResult(
                action_type="QUARANTINE_TAG",
                status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"tags": {}},
                after_state={"tags": tags},
                rollback_command=f"aws resourcegroupstaggingapi untag-resources --resource-arn-list {resource_arn} --tag-keys WOLFIR-QUARANTINE QUARANTINE-TIMESTAMP QUARANTINE-INCIDENT",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TagResources"},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )
        try:
            import boto3
            client = boto3.client("resourcegroupstaggingapi")
            client.tag_resources(ResourceARNList=[resource_arn], Tags=tags)
            return ExecutionResult(
                action_type="QUARANTINE_TAG",
                status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"tags": {}},
                after_state={"tags": tags},
                rollback_command=f"aws resourcegroupstaggingapi untag-resources --resource-arn-list {resource_arn} --tag-keys WOLFIR-QUARANTINE QUARANTINE-TIMESTAMP QUARANTINE-INCIDENT",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TagResources"},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_quarantine_tag failed: {e}")
            return ExecutionResult(
                action_type="QUARANTINE_TAG",
                status="FAILED",
                resource_arn=resource_arn,
                before_state={},
                after_state={},
                rollback_command="",
                cloudtrail_event={},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )

    async def execute_deny_policy(
        self, role_name: str, denied_actions: List[str], incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        policy_name = f"wolfir-EmergencyDeny-{incident_id.replace('INC-', 'INC')[:12]}"
        policy_doc = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Deny",
                    "Action": denied_actions or ["*"],
                    "Resource": "*",
                }
            ],
        }
        if self.demo_mode:
            return ExecutionResult(
                action_type="DENY_POLICY",
                status="SUCCESS",
                resource_arn=f"arn:aws:iam::123456789012:role/{role_name}",
                before_state={"inline_policies": ["ReadOnlyAccess"]},
                after_state={"inline_policies": ["ReadOnlyAccess", policy_name]},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )
        try:
            import boto3
            iam = boto3.client("iam")
            iam.put_role_policy(RoleName=role_name, PolicyName=policy_name, PolicyDocument=json.dumps(policy_doc))
            return ExecutionResult(
                action_type="DENY_POLICY",
                status="SUCCESS",
                resource_arn=f"arn:aws:iam::123456789012:role/{role_name}",
                before_state={},
                after_state={"policy_added": policy_name},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_deny_policy failed: {e}")
            return ExecutionResult(
                action_type="DENY_POLICY",
                status="FAILED",
                resource_arn=f"arn:aws:iam::123456789012:role/{role_name}",
                before_state={},
                after_state={},
                rollback_command="",
                cloudtrail_event={},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )

    async def execute_disable_access_key(
        self, access_key_id: str, username: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        if self.demo_mode:
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY",
                status="SUCCESS",
                resource_arn=f"arn:aws:iam::123456789012:user/{username}",
                before_state={"Status": "Active"},
                after_state={"Status": "Inactive"},
                rollback_command=f"aws iam update-access-key --access-key-id {access_key_id} --user-name {username} --status Active",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "UpdateAccessKey"},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        try:
            import boto3
            iam = boto3.client("iam")
            iam.update_access_key(AccessKeyId=access_key_id, UserName=username, Status="Inactive")
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY",
                status="SUCCESS",
                resource_arn=f"arn:aws:iam::123456789012:user/{username}",
                before_state={"Status": "Active"},
                after_state={"Status": "Inactive"},
                rollback_command=f"aws iam update-access-key --access-key-id {access_key_id} --user-name {username} --status Active",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "UpdateAccessKey"},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_disable_access_key failed: {e}")
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY",
                status="FAILED",
                resource_arn=f"arn:aws:iam::123456789012:user/{username}",
                before_state={},
                after_state={},
                rollback_command="",
                cloudtrail_event={},
                execution_timestamp=datetime.utcnow().isoformat(),
                executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
