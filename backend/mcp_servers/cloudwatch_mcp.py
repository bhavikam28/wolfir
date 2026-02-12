"""
CloudWatch MCP Server — Custom implementation (boto3)

Provides MCP-compatible tools for security monitoring,
metric analysis, and anomaly detection via CloudWatch.

Inspired by awslabs/mcp patterns. Integrated into Nova Sentinel's FastMCP.
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class CloudWatchMCPServer:
    """
    CloudWatch MCP tools for security monitoring.

    Provides tools for:
    - Security metric alarms overview
    - Anomaly detection on API call patterns
    - Log insight queries for security events
    - Dashboard-ready metric data
    """

    def __init__(self):
        self.settings = get_settings()
        self._cw_client = None
        self._logs_client = None

    @property
    def cw_client(self):
        if self._cw_client is None:
            if self.settings.aws_profile and self.settings.aws_profile != "default":
                session = boto3.Session(profile_name=self.settings.aws_profile)
            else:
                session = boto3.Session()
            self._cw_client = session.client('cloudwatch', region_name=self.settings.aws_region)
            logger.info(f"CloudWatch MCP: client initialized ({self.settings.aws_region})")
        return self._cw_client

    @property
    def logs_client(self):
        if self._logs_client is None:
            if self.settings.aws_profile and self.settings.aws_profile != "default":
                session = boto3.Session(profile_name=self.settings.aws_profile)
            else:
                session = boto3.Session()
            self._logs_client = session.client('logs', region_name=self.settings.aws_region)
        return self._logs_client

    async def get_security_alarms(self) -> Dict[str, Any]:
        """
        Get all CloudWatch alarms related to security.

        Returns:
            Dict with alarms, their states, and security relevance
        """
        try:
            response = await asyncio.to_thread(
                self.cw_client.describe_alarms,
                MaxRecords=100
            )

            alarms = []
            security_keywords = [
                "security", "iam", "unauthorized", "root", "login",
                "access", "denied", "error", "threat", "anomaly",
                "cloudtrail", "guardduty", "config",
            ]

            for alarm in response.get("MetricAlarms", []):
                name = alarm.get("AlarmName", "").lower()
                desc = (alarm.get("AlarmDescription") or "").lower()
                is_security = any(kw in name or kw in desc for kw in security_keywords)

                alarms.append({
                    "name": alarm.get("AlarmName", ""),
                    "state": alarm.get("StateValue", "UNKNOWN"),
                    "metric": alarm.get("MetricName", ""),
                    "namespace": alarm.get("Namespace", ""),
                    "threshold": alarm.get("Threshold"),
                    "comparison": alarm.get("ComparisonOperator", ""),
                    "is_security_related": is_security,
                    "description": alarm.get("AlarmDescription", ""),
                    "last_updated": alarm.get("StateUpdatedTimestamp", "").isoformat() if isinstance(alarm.get("StateUpdatedTimestamp"), datetime) else str(alarm.get("StateUpdatedTimestamp", "")),
                })

            security_alarms = [a for a in alarms if a["is_security_related"]]
            alarming = [a for a in alarms if a["state"] == "ALARM"]

            return {
                "alarms": alarms,
                "total": len(alarms),
                "security_related": len(security_alarms),
                "in_alarm_state": len(alarming),
                "alarming_alarms": alarming,
                "source": "cloudwatch-mcp-server",
            }
        except Exception as e:
            logger.error(f"CloudWatch MCP: get_security_alarms failed: {e}")
            return {"error": str(e), "source": "cloudwatch-mcp-server"}

    async def get_api_call_metrics(self, hours_back: int = 24) -> Dict[str, Any]:
        """
        Get API call volume metrics from CloudWatch for anomaly detection.

        Args:
            hours_back: Number of hours to look back

        Returns:
            Dict with API call metrics and anomaly indicators
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours_back)

            # Query CloudTrail API call count metric
            response = await asyncio.to_thread(
                self.cw_client.get_metric_statistics,
                Namespace="AWS/CloudTrail",
                MetricName="EventCount",
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,  # 1-hour intervals
                Statistics=["Sum", "Maximum"],
            )

            datapoints = response.get("Datapoints", [])
            datapoints.sort(key=lambda x: x.get("Timestamp", ""))

            # Calculate anomaly indicators
            values = [dp.get("Sum", 0) for dp in datapoints]
            avg_val = sum(values) / len(values) if values else 0
            max_val = max(values) if values else 0

            anomaly_detected = max_val > avg_val * 3 if avg_val > 0 else False

            metric_data = []
            for dp in datapoints:
                ts = dp.get("Timestamp")
                metric_data.append({
                    "timestamp": ts.isoformat() if isinstance(ts, datetime) else str(ts),
                    "event_count": dp.get("Sum", 0),
                    "max_burst": dp.get("Maximum", 0),
                })

            return {
                "metrics": metric_data,
                "total_events": sum(values),
                "average_per_hour": round(avg_val, 1),
                "peak_hour": round(max_val, 1),
                "anomaly_detected": anomaly_detected,
                "anomaly_reason": f"Peak ({max_val:.0f}) exceeds 3x average ({avg_val:.0f})" if anomaly_detected else None,
                "time_range_hours": hours_back,
                "source": "cloudwatch-mcp-server",
            }
        except ClientError as e:
            # CloudTrail metrics may not be enabled
            logger.warning(f"CloudWatch MCP: API call metrics unavailable: {e}")
            return {
                "metrics": [],
                "note": "CloudTrail metrics not available — enable CloudTrail Insights for API call monitoring",
                "source": "cloudwatch-mcp-server",
            }
        except Exception as e:
            logger.error(f"CloudWatch MCP: get_api_call_metrics failed: {e}")
            return {"error": str(e), "source": "cloudwatch-mcp-server"}

    async def get_ec2_security_metrics(self, hours_back: int = 6) -> Dict[str, Any]:
        """
        Get EC2 security-relevant metrics (CPU spikes, network anomalies).

        Args:
            hours_back: Number of hours to look back

        Returns:
            Dict with EC2 metrics and potential crypto-mining indicators
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours_back)

            # Get high CPU utilization instances (crypto-mining indicator)
            cpu_response = await asyncio.to_thread(
                self.cw_client.get_metric_statistics,
                Namespace="AWS/EC2",
                MetricName="CPUUtilization",
                StartTime=start_time,
                EndTime=end_time,
                Period=300,  # 5-minute intervals
                Statistics=["Average", "Maximum"],
            )

            network_response = await asyncio.to_thread(
                self.cw_client.get_metric_statistics,
                Namespace="AWS/EC2",
                MetricName="NetworkOut",
                StartTime=start_time,
                EndTime=end_time,
                Period=300,
                Statistics=["Sum", "Maximum"],
            )

            cpu_data = cpu_response.get("Datapoints", [])
            network_data = network_response.get("Datapoints", [])

            high_cpu = [dp for dp in cpu_data if dp.get("Maximum", 0) > 90]

            return {
                "cpu_metrics": {
                    "datapoints": len(cpu_data),
                    "high_cpu_periods": len(high_cpu),
                    "max_cpu": max((dp.get("Maximum", 0) for dp in cpu_data), default=0),
                    "avg_cpu": round(sum(dp.get("Average", 0) for dp in cpu_data) / max(len(cpu_data), 1), 1),
                },
                "network_metrics": {
                    "datapoints": len(network_data),
                    "total_bytes_out": sum(dp.get("Sum", 0) for dp in network_data),
                    "max_burst_bytes": max((dp.get("Maximum", 0) for dp in network_data), default=0),
                },
                "crypto_mining_risk": "HIGH" if len(high_cpu) > 3 else "MEDIUM" if high_cpu else "LOW",
                "data_exfiltration_risk": "HIGH" if sum(dp.get("Sum", 0) for dp in network_data) > 10_000_000_000 else "LOW",
                "time_range_hours": hours_back,
                "source": "cloudwatch-mcp-server",
            }
        except Exception as e:
            logger.error(f"CloudWatch MCP: get_ec2_security_metrics failed: {e}")
            return {"error": str(e), "source": "cloudwatch-mcp-server"}

    async def get_billing_anomalies(self, days_back: int = 7) -> Dict[str, Any]:
        """
        Check for billing anomalies that could indicate security incidents.

        Args:
            days_back: Number of days to look back

        Returns:
            Dict with billing metrics and anomaly detection
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=days_back)

            response = await asyncio.to_thread(
                self.cw_client.get_metric_statistics,
                Namespace="AWS/Billing",
                MetricName="EstimatedCharges",
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,  # Daily
                Statistics=["Maximum"],
                Dimensions=[{"Name": "Currency", "Value": "USD"}],
            )

            datapoints = response.get("Datapoints", [])
            datapoints.sort(key=lambda x: x.get("Timestamp", ""))

            daily_costs = []
            for dp in datapoints:
                ts = dp.get("Timestamp")
                daily_costs.append({
                    "date": ts.isoformat() if isinstance(ts, datetime) else str(ts),
                    "estimated_charges_usd": dp.get("Maximum", 0),
                })

            values = [dp.get("Maximum", 0) for dp in datapoints]
            if len(values) >= 2:
                cost_increase = values[-1] - values[0] if values else 0
                daily_rate = cost_increase / max(len(values), 1)
            else:
                cost_increase = 0
                daily_rate = 0

            return {
                "daily_costs": daily_costs,
                "current_estimated": values[-1] if values else 0,
                "cost_increase_period": round(cost_increase, 2),
                "daily_burn_rate": round(daily_rate, 2),
                "anomaly_detected": daily_rate > 10,  # More than $10/day increase
                "anomaly_reason": f"Daily burn rate ${daily_rate:.2f}/day exceeds threshold" if daily_rate > 10 else None,
                "days_analyzed": days_back,
                "source": "cloudwatch-mcp-server",
            }
        except ClientError as e:
            logger.warning(f"CloudWatch MCP: billing metrics require us-east-1: {e}")
            return {
                "note": "Billing metrics are only available in us-east-1. Switch region or enable billing alerts.",
                "source": "cloudwatch-mcp-server",
            }
        except Exception as e:
            logger.error(f"CloudWatch MCP: get_billing_anomalies failed: {e}")
            return {"error": str(e), "source": "cloudwatch-mcp-server"}


# Singleton
_cloudwatch_mcp = None

def get_cloudwatch_mcp() -> CloudWatchMCPServer:
    global _cloudwatch_mcp
    if _cloudwatch_mcp is None:
        _cloudwatch_mcp = CloudWatchMCPServer()
    return _cloudwatch_mcp
