"""
Security Hub MCP Server — Custom implementation (boto3)

Provides MCP-compatible tools for AWS Security Hub findings.
Pre-correlated, severity-scored findings from GuardDuty, Inspector, etc.
— ideal input for the wolfir pipeline.

Inspired by awslabs/mcp patterns. Integrated into wolfir's FastMCP.
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


def _get_sh_client(session: boto3.Session, region: str, target_role_arn: Optional[str] = None):
    """Create Security Hub client, optionally using AssumeRole."""
    if target_role_arn:
        sts = session.client('sts', region_name=region)
        assumed = sts.assume_role(RoleArn=target_role_arn, RoleSessionName="wolfir-securityhub")
        creds = assumed['Credentials']
        return boto3.client('securityhub', region_name=region,
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'])
    return session.client('securityhub', region_name=region)


class SecurityHubMCPServer:
    """
    Security Hub MCP tools for pre-correlated security findings.

    Provides tools for:
    - GetFindings (severity, product, region filters)
    - Pre-correlated findings from GuardDuty, Inspector, etc.
    """

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    def _session(self) -> boto3.Session:
        if self.settings.aws_profile and self.settings.aws_profile != "default":
            return boto3.Session(profile_name=self.settings.aws_profile)
        return boto3.Session()

    @property
    def client(self):
        """Lazy-initialize Security Hub client."""
        if self._client is None:
            session = self._session()
            self._client = session.client('securityhub', region_name=self.settings.aws_region)
            logger.info(f"Security Hub MCP: client initialized ({self.settings.aws_region})")
        return self._client

    def _get_client_for_request(self, target_role_arn: Optional[str] = None):
        """Get client for cross-account. Uses default client when not set."""
        if not target_role_arn and not (self.settings.aws_target_role_arn or "").strip():
            return self.client
        session = self._session()
        role = target_role_arn or self.settings.aws_target_role_arn
        return _get_sh_client(session, self.settings.aws_region, role)

    async def get_findings(
        self,
        severity: Optional[str] = None,
        product_arn: Optional[str] = None,
        max_results: int = 50,
        days_back: Optional[int] = None,
        target_role_arn: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get Security Hub findings.

        Findings are pre-correlated and severity-scored — ideal for pipeline input.

        Args:
            severity: Filter — CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
            product_arn: Filter by product (e.g. GuardDuty, Inspector)
            max_results: Maximum findings to return

        Returns:
            Dict with findings, severity summary, and risk indicators
        """
        client = self._get_client_for_request(target_role_arn)
        filters = {}

        if severity:
            filters['SeverityLabel'] = [{'Value': severity, 'Comparison': 'EQUALS'}]
        if product_arn:
            filters['ProductArn'] = [{'Value': product_arn, 'Comparison': 'EQUALS'}]
        if days_back:
            filters['UpdatedAt'] = [{'DateRange': {'Value': days_back, 'Unit': 'DAYS'}}]

        all_findings = []
        next_token = None

        try:
            while len(all_findings) < max_results:
                params = {'MaxResults': min(50, max_results - len(all_findings))}
                if filters:
                    params['Filters'] = filters
                if next_token:
                    params['NextToken'] = next_token

                response = await asyncio.to_thread(client.get_findings, **params)
                findings = response.get('Findings', [])
                all_findings.extend(findings)

                next_token = response.get('NextToken')
                if not next_token or len(all_findings) >= max_results:
                    break

            # Normalize for pipeline consumption
            normalized = []
            severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFORMATIONAL": 0}
            for f in all_findings[:max_results]:
                sev = f.get('Severity', {}).get('Label', 'UNKNOWN')
                severity_counts[sev] = severity_counts.get(sev, 0) + 1
                normalized.append({
                    "id": f.get('Id'),
                    "arn": f.get('Id'),
                    "title": f.get('Title'),
                    "description": f.get('Description'),
                    "severity": sev,
                    "product_arn": f.get('ProductArn'),
                    "product_name": f.get('ProductFields', {}).get('aws/securityhub/ProductName', 'Unknown'),
                    "region": f.get('Region'),
                    "account_id": f.get('AwsAccountId'),
                    "updated_at": f.get('UpdatedAt', ''),
                    "resources": f.get('Resources', []),
                })

            return {
                "findings": normalized,
                "total_count": len(normalized),
                "severity_summary": severity_counts,
                "source": "securityhub-mcp-server",
            }
        except ClientError as e:
            logger.error(f"Security Hub MCP: get_findings failed: {e}")
            return {"error": str(e), "findings": [], "source": "securityhub-mcp-server"}


# Singleton
_security_hub_mcp = None


def get_security_hub_mcp() -> SecurityHubMCPServer:
    global _security_hub_mcp
    if _security_hub_mcp is None:
        _security_hub_mcp = SecurityHubMCPServer()
    return _security_hub_mcp
