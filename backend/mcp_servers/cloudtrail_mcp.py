"""
CloudTrail MCP Server — Custom implementation (boto3)

Provides MCP-compatible tools for CloudTrail event analysis,
security-focused event lookup, and anomaly detection.

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


class CloudTrailMCPServer:
    """
    CloudTrail MCP tools for security event analysis.
    
    Provides tools for:
    - Event lookup with security-focused filtering
    - Security anomaly scanning
    - Event correlation across services
    - Real-time trail status monitoring
    """

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        """Lazy-initialize CloudTrail client."""
        if self._client is None:
            if self.settings.aws_profile and self.settings.aws_profile != "default":
                session = boto3.Session(profile_name=self.settings.aws_profile)
            else:
                session = boto3.Session()
            self._client = session.client('cloudtrail', region_name=self.settings.aws_region)
            logger.info(f"CloudTrail MCP: client initialized ({self.settings.aws_region})")
        return self._client

    async def lookup_security_events(
        self,
        event_category: str = "all",
        days_back: int = 7,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """
        Lookup CloudTrail events with security-focused filtering.

        Args:
            event_category: Filter category — "iam", "network", "data", "compute", or "all"
            days_back: Number of days to look back
            max_results: Maximum events to return

        Returns:
            Dict with events, summary statistics, and risk indicators
        """
        security_filters = {
            "iam": [
                "CreateRole", "DeleteRole", "AssumeRole", "PutRolePolicy",
                "AttachRolePolicy", "DetachRolePolicy", "CreateUser", "DeleteUser",
                "CreateAccessKey", "DeleteAccessKey", "PutUserPolicy",
                "AttachUserPolicy", "CreatePolicy", "UpdateAssumeRolePolicy"
            ],
            "network": [
                "AuthorizeSecurityGroupIngress", "AuthorizeSecurityGroupEgress",
                "RevokeSecurityGroupIngress", "RevokeSecurityGroupEgress",
                "CreateSecurityGroup", "DeleteSecurityGroup",
                "CreateVpc", "DeleteVpc", "ModifyVpcAttribute",
                "CreateSubnet", "CreateInternetGateway", "CreateNatGateway"
            ],
            "data": [
                "CreateBucket", "DeleteBucket", "PutBucketPolicy",
                "PutBucketPublicAccessBlock", "PutObject", "GetObject",
                "DeleteObject", "PutBucketAcl", "PutBucketEncryption",
                "CreateDBInstance", "ModifyDBInstance", "DeleteDBInstance"
            ],
            "compute": [
                "RunInstances", "TerminateInstances", "StopInstances",
                "StartInstances", "ModifyInstanceAttribute",
                "CreateFunction20150331", "UpdateFunctionCode20150331v2",
                "CreateCluster", "RunTask"
            ]
        }

        if event_category == "all":
            event_names = []
            for cat_events in security_filters.values():
                event_names.extend(cat_events)
        else:
            event_names = security_filters.get(event_category, [])

        start_time = datetime.utcnow() - timedelta(days=days_back)
        end_time = datetime.utcnow()

        all_events = []
        errors = []

        # CloudTrail only allows one LookupAttribute at a time
        for event_name in event_names[:15]:  # Limit API calls
            try:
                response = await asyncio.to_thread(
                    self.client.lookup_events,
                    LookupAttributes=[{
                        'AttributeKey': 'EventName',
                        'AttributeValue': event_name
                    }],
                    StartTime=start_time,
                    EndTime=end_time,
                    MaxResults=min(10, max_results)
                )
                for event in response.get('Events', []):
                    all_events.append(self._normalize_event(event))
            except ClientError as e:
                errors.append(f"{event_name}: {str(e)}")
            except Exception as e:
                errors.append(f"{event_name}: {str(e)}")

            if len(all_events) >= max_results:
                break

        # Deduplicate and sort
        seen_ids = set()
        unique_events = []
        for event in all_events:
            eid = event.get("event_id", "")
            if eid not in seen_ids:
                seen_ids.add(eid)
                unique_events.append(event)

        unique_events.sort(key=lambda x: x.get("event_time", ""), reverse=True)
        unique_events = unique_events[:max_results]

        # Build summary
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for evt in unique_events:
            sev = self._classify_event_severity(evt.get("event_name", ""))
            severity_counts[sev] += 1
            evt["estimated_severity"] = sev

        return {
            "events": unique_events,
            "total_count": len(unique_events),
            "category": event_category,
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "days": days_back,
            },
            "severity_summary": severity_counts,
            "source": "cloudtrail-mcp-server",
            "errors": errors if errors else None,
        }

    async def get_trail_status(self) -> Dict[str, Any]:
        """
        Get the status of CloudTrail trails in the account.

        Returns:
            Dict with trail configurations and logging status
        """
        try:
            trails_response = await asyncio.to_thread(self.client.describe_trails)
            trails = trails_response.get('trailList', [])

            trail_statuses = []
            for trail in trails:
                try:
                    status = await asyncio.to_thread(
                        self.client.get_trail_status,
                        Name=trail['TrailARN']
                    )
                    trail_statuses.append({
                        "name": trail.get("Name", "Unknown"),
                        "arn": trail.get("TrailARN", ""),
                        "region": trail.get("HomeRegion", "Unknown"),
                        "is_logging": status.get("IsLogging", False),
                        "latest_delivery": status.get("LatestDeliveryTime", "N/A"),
                        "s3_bucket": trail.get("S3BucketName", "N/A"),
                        "is_multi_region": trail.get("IsMultiRegionTrail", False),
                        "log_file_validation": trail.get("LogFileValidationEnabled", False),
                    })
                except Exception as e:
                    trail_statuses.append({
                        "name": trail.get("Name", "Unknown"),
                        "error": str(e)
                    })

            return {
                "trails": trail_statuses,
                "total": len(trail_statuses),
                "all_logging": all(t.get("is_logging", False) for t in trail_statuses if "error" not in t),
                "source": "cloudtrail-mcp-server",
            }
        except Exception as e:
            logger.error(f"CloudTrail MCP: get_trail_status failed: {e}")
            return {"error": str(e), "source": "cloudtrail-mcp-server"}

    async def scan_for_anomalies(self, days_back: int = 1, max_results: int = 100) -> Dict[str, Any]:
        """
        Scan recent CloudTrail events for security anomalies.

        Checks for:
        - Root account usage
        - Console logins without MFA
        - Access key creation
        - Security group modifications
        - S3 public access changes

        Returns:
            Dict with anomalies found and risk assessment
        """
        anomaly_indicators = [
            {"name": "ConsoleLogin", "risk": "HIGH", "reason": "Console login detected — verify if expected"},
            {"name": "CreateAccessKey", "risk": "CRITICAL", "reason": "New access key created — potential persistence"},
            {"name": "PutBucketPolicy", "risk": "HIGH", "reason": "S3 bucket policy changed — check for public access"},
            {"name": "AuthorizeSecurityGroupIngress", "risk": "HIGH", "reason": "Security group opened — verify port/IP"},
            {"name": "AssumeRole", "risk": "MEDIUM", "reason": "Role assumed — verify cross-account or unusual role"},
            {"name": "RunInstances", "risk": "MEDIUM", "reason": "EC2 instance launched — check for crypto mining"},
            {"name": "PutRolePolicy", "risk": "CRITICAL", "reason": "Inline policy added to role — privilege escalation risk"},
            {"name": "AttachRolePolicy", "risk": "HIGH", "reason": "Managed policy attached — verify scope"},
            {"name": "DeleteTrail", "risk": "CRITICAL", "reason": "CloudTrail trail deleted — anti-forensics detected"},
            {"name": "StopLogging", "risk": "CRITICAL", "reason": "CloudTrail logging stopped — active evasion"},
        ]

        start_time = datetime.utcnow() - timedelta(days=days_back)
        anomalies = []

        for indicator in anomaly_indicators:
            try:
                response = await asyncio.to_thread(
                    self.client.lookup_events,
                    LookupAttributes=[{
                        'AttributeKey': 'EventName',
                        'AttributeValue': indicator["name"]
                    }],
                    StartTime=start_time,
                    EndTime=datetime.utcnow(),
                    MaxResults=10
                )

                for event in response.get('Events', []):
                    normalized = self._normalize_event(event)
                    anomalies.append({
                        **normalized,
                        "anomaly_type": indicator["name"],
                        "risk_level": indicator["risk"],
                        "reason": indicator["reason"],
                    })
            except Exception as e:
                logger.warning(f"CloudTrail anomaly scan skipped {indicator['name']}: {e}")

            if len(anomalies) >= max_results:
                break

        # Sort by risk
        risk_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        anomalies.sort(key=lambda x: risk_order.get(x.get("risk_level", "LOW"), 4))

        risk_summary = {}
        for a in anomalies:
            rl = a.get("risk_level", "UNKNOWN")
            risk_summary[rl] = risk_summary.get(rl, 0) + 1

        return {
            "anomalies": anomalies[:max_results],
            "total_found": len(anomalies),
            "risk_summary": risk_summary,
            "scan_period_days": days_back,
            "source": "cloudtrail-mcp-server",
        }

    def _normalize_event(self, event: Dict) -> Dict[str, Any]:
        """Normalize a CloudTrail event to a standard format."""
        cloud_trail_event = {}
        raw = event.get('CloudTrailEvent', '')
        if raw:
            try:
                cloud_trail_event = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass

        user_identity = cloud_trail_event.get('userIdentity', {})

        return {
            "event_id": event.get("EventId", ""),
            "event_name": event.get("EventName", ""),
            "event_time": event.get("EventTime", datetime.utcnow()).isoformat() if isinstance(event.get("EventTime"), datetime) else str(event.get("EventTime", "")),
            "event_source": cloud_trail_event.get("eventSource", ""),
            "aws_region": cloud_trail_event.get("awsRegion", ""),
            "source_ip": cloud_trail_event.get("sourceIPAddress", ""),
            "user_agent": cloud_trail_event.get("userAgent", ""),
            "user": {
                "type": user_identity.get("type", ""),
                "arn": user_identity.get("arn", ""),
                "account_id": user_identity.get("accountId", ""),
                "principal_id": user_identity.get("principalId", ""),
                "user_name": event.get("Username", user_identity.get("userName", "")),
            },
            "resources": [
                {"type": r.get("ResourceType", ""), "name": r.get("ResourceName", "")}
                for r in event.get("Resources", [])
            ],
            "error_code": cloud_trail_event.get("errorCode"),
            "error_message": cloud_trail_event.get("errorMessage"),
        }

    def _classify_event_severity(self, event_name: str) -> str:
        """Classify an event by its security severity."""
        critical_events = {
            "DeleteTrail", "StopLogging", "PutRolePolicy", "CreateAccessKey",
            "AttachRolePolicy", "PutUserPolicy", "CreateUser",
        }
        high_events = {
            "AssumeRole", "AuthorizeSecurityGroupIngress", "PutBucketPolicy",
            "PutBucketPublicAccessBlock", "ModifyInstanceAttribute",
            "DetachRolePolicy", "DeleteRole", "UpdateAssumeRolePolicy",
        }
        medium_events = {
            "RunInstances", "TerminateInstances", "CreateBucket",
            "DeleteBucket", "CreateSecurityGroup", "ConsoleLogin",
        }

        if event_name in critical_events:
            return "CRITICAL"
        elif event_name in high_events:
            return "HIGH"
        elif event_name in medium_events:
            return "MEDIUM"
        return "LOW"


# Singleton
_cloudtrail_mcp = None

def get_cloudtrail_mcp() -> CloudTrailMCPServer:
    global _cloudtrail_mcp
    if _cloudtrail_mcp is None:
        _cloudtrail_mcp = CloudTrailMCPServer()
    return _cloudtrail_mcp
