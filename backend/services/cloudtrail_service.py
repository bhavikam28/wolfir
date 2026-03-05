"""
Amazon CloudTrail service for fetching real API events.
Supports multi-region fetch and proper pagination to maximize event retrieval.
"""
import asyncio
import boto3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger

# Common regions to query — CloudTrail LookupEvents is per-region
DEFAULT_REGIONS = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1"]

# Routine/noise events to filter out before analysis (avoids hallucinated incidents)
NOISE_EVENTS = frozenset({
    "PutLogEvents", "CreateLogStream", "CreateLogGroup",
    "DescribeLogGroups", "DescribeLogStreams", "FilterLogEvents",
    "GetLogEvents", "TestMetricFilter", "PutMetricData",
    "GetMetricData", "DescribeAlarms", "ListMetrics",
    "BatchGetImage", "GetDownloadUrlForLayer", "GetAuthorizationToken",
    "DescribeRepositories", "InitiateLayerUpload", "UploadLayerPart",
    "CompleteLayerUpload", "PutImage", "ListImages",
    "GetBucketLocation", "GetBucketAcl", "HeadBucket",
    "GetBucketVersioning", "GetBucketEncryption",
    "GetBucketPolicy", "GetBucketTagging",
    "DescribeTable", "ListTables",
    "GetParameters", "GetParameter", "DescribeParameters",
    "GenerateDataKey", "Decrypt", "Encrypt",
    "DescribeKey", "ListKeys",
    "GetHostedZone", "ListResourceRecordSets",
    "DescribeCertificate", "ListCertificates",
    "LookupEvents",
})

# Security-relevant read events (recon, credential access, data access)
SECURITY_READ_EVENT_NAMES = [
    "GetSecretValue", "GetObject", "ListObjects", "ListObjectsV2",
    "DescribeInstances", "DescribeSecurityGroups", "DescribeVolumes",
    "ListUsers", "ListRoles", "ListAccessKeys", "GetCallerIdentity",
    "ListBuckets", "GetBucketPolicy", "GetBucketAcl",
    "AssumeRole", "GetSessionToken",
]


class CloudTrailService:
    """Service for fetching real CloudTrail events"""
    
    def __init__(self, profile: Optional[str] = None):
        self.settings = get_settings()
        
        # Use provided profile, or fall back to settings, or default
        profile_to_use = profile or self.settings.aws_profile
        
        # Create session with profile if specified
        if profile_to_use and profile_to_use != "default":
            self.session = boto3.Session(profile_name=profile_to_use)
            logger.info(f"Using AWS profile: {profile_to_use} for CloudTrail")
        else:
            self.session = boto3.Session()
            logger.info("Using default AWS credentials for CloudTrail")
        
        self.client = self.session.client(
            'cloudtrail',
            region_name=self.settings.aws_region
        )
        logger.info(f"CloudTrail client initialized for region: {self.settings.aws_region}")
    
    async def lookup_events(
        self,
        event_names: Optional[List[str]] = None,
        resource_arns: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Lookup CloudTrail events
        
        Args:
            event_names: Filter by event names (e.g., ['CreateRole', 'AssumeRole'])
            resource_arns: Filter by resource ARNs
            start_time: Start time for lookup
            end_time: End time for lookup
            max_results: Maximum number of events to return
            
        Returns:
            List of CloudTrail events
        """
        try:
            if not start_time:
                start_time = datetime.utcnow() - timedelta(days=7)
            if not end_time:
                end_time = datetime.utcnow()
            
            lookup_attributes = []
            
            if event_names:
                for event_name in event_names:
                    lookup_attributes.append({
                        'AttributeKey': 'EventName',
                        'AttributeValue': event_name
                    })
            
            if resource_arns:
                for resource_arn in resource_arns:
                    lookup_attributes.append({
                        'AttributeKey': 'ResourceArn',
                        'AttributeValue': resource_arn
                    })
            
            all_events = []
            
            # CloudTrail lookup_events returns max 50 per call, so we paginate
            next_token = None
            
            while len(all_events) < max_results:
                params = {
                    'StartTime': start_time,
                    'EndTime': end_time,
                    'MaxResults': min(50, max_results - len(all_events))
                }
                
                if lookup_attributes:
                    params['LookupAttributes'] = lookup_attributes[:1]  # Only one at a time
                
                if next_token:
                    params['NextToken'] = next_token
                
                response = await asyncio.to_thread(
                    self.client.lookup_events,
                    **params
                )
                
                events = response.get('Events', [])
                all_events.extend(events)
                
                next_token = response.get('NextToken')
                if not next_token or len(all_events) >= max_results:
                    break
            
            logger.info(f"Retrieved {len(all_events)} CloudTrail events")
            return all_events[:max_results]
            
        except ClientError as e:
            logger.error(f"Error fetching CloudTrail events: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching CloudTrail events: {e}")
            return []
    
    async def _fetch_region_events(
        self,
        region: str,
        start_time: datetime,
        end_time: datetime,
        max_per_region: int,
        read_only: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch events for a single region with pagination and rate limiting.
        read_only: None = no filter, True = read events only, False = write events only.
        """
        client = self.session.client('cloudtrail', region_name=region)
        all_events = []
        next_token = None
        pages = 0
        max_pages = 20  # 20 * 50 = 1000 per region max
        try:
            while len(all_events) < max_per_region and pages < max_pages:
                params = {
                    'StartTime': start_time,
                    'EndTime': end_time,
                    'MaxResults': 50,
                }
                if read_only is not None:
                    params['LookupAttributes'] = [
                        {'AttributeKey': 'ReadOnly', 'AttributeValue': str(read_only).lower()}
                    ]
                if next_token:
                    params['NextToken'] = next_token
                response = await asyncio.to_thread(
                    client.lookup_events,
                    **params
                )
                events = response.get('Events', [])
                pages += 1
                all_events.extend(events)
                next_token = response.get('NextToken')
                if not next_token:
                    break
                await asyncio.sleep(0.6)
        except ClientError as e:
            if e.response.get('Error', {}).get('Code') == 'AccessDeniedException':
                raise PermissionError(
                    "CloudTrail access denied. Add cloudtrail:LookupEvents to IAM user. See docs/IAM-POLICY-CLOUDTRAIL.md"
                ) from e
            logger.warning(f"CloudTrail fetch failed for {region}: {e}")
        return all_events

    def _extract_event_name(self, event: Dict[str, Any]) -> str:
        """Extract event name from CloudTrail event (CloudTrailEvent JSON or EventName)."""
        if 'CloudTrailEvent' in event:
            try:
                import json
                ct = json.loads(event['CloudTrailEvent'])
                return ct.get('eventName', '') or ''
            except (json.JSONDecodeError, TypeError):
                pass
        return event.get('EventName', '') or ''

    async def get_security_events(
        self,
        days_back: int = 7,
        max_results: int = 100,
        regions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get security-relevant CloudTrail events (write + security-relevant read).
        Pass 1: Write events (ReadOnly=false) — CreateRole, AttachRolePolicy, etc.
        Pass 2: Security-relevant read events (GetSecretValue, GetObject, DescribeInstances, etc.)
        """
        start_time = datetime.utcnow() - timedelta(days=days_back)
        end_time = datetime.utcnow()
        regions_to_query = regions or DEFAULT_REGIONS
        per_region = max(50, (max_results // len(regions_to_query)) + 20)
        all_events = []
        seen_ids = set()

        for region in regions_to_query:
            if len(all_events) >= max_results:
                break
            try:
                region_events = await self._fetch_region_events(
                    region, start_time, end_time, per_region, read_only=False
                )
                for e in region_events:
                    eid = e.get('EventId')
                    if eid and eid not in seen_ids:
                        seen_ids.add(eid)
                        all_events.append(e)
                if region_events:
                    logger.info(f"CloudTrail {region}: {len(region_events)} write events")
                await asyncio.sleep(0.5)
            except PermissionError:
                raise
            except Exception as e:
                logger.warning(f"CloudTrail fetch error for {region}: {e}")

        read_per_region = max(20, per_region // 2)
        for region in regions_to_query:
            if len(all_events) >= max_results:
                break
            try:
                read_events = await self._fetch_region_events(
                    region, start_time, end_time, read_per_region, read_only=True
                )
                added = 0
                for e in read_events:
                    eid = e.get('EventId')
                    if eid and eid not in seen_ids:
                        name = self._extract_event_name(e)
                        if name in SECURITY_READ_EVENT_NAMES:
                            seen_ids.add(eid)
                            all_events.append(e)
                            added += 1
                if added:
                    logger.info(f"CloudTrail {region}: {added} security-relevant read events")
                await asyncio.sleep(0.5)
            except PermissionError:
                raise
            except Exception as e:
                logger.warning(f"CloudTrail read fetch error for {region}: {e}")

        sorted_events = sorted(
            all_events,
            key=lambda x: str(x.get('EventTime', '')),
            reverse=True
        )
        # Filter out noise events; keep events with errorCode (failed attempts are interesting)
        def _has_error(ev: Dict[str, Any]) -> bool:
            if ev.get("errorCode"):
                return True
            ct = ev.get("CloudTrailEvent")
            if isinstance(ct, str) and "errorCode" in ct:
                try:
                    import json
                    parsed = json.loads(ct)
                    return bool(parsed.get("errorCode")) if isinstance(parsed, dict) else False
                except Exception:
                    return True  # Keep if we can't parse
            return False

        filtered = [
            e for e in sorted_events
            if self._extract_event_name(e) not in NOISE_EVENTS or _has_error(e)
        ]
        result = filtered[:max_results]
        if len(filtered) < len(sorted_events):
            logger.info(f"Filtered {len(sorted_events) - len(filtered)} noise events")
        logger.info(
            f"CloudTrail: {len(result)} unique events (write + security read) from {len(regions_to_query)} regions "
            f"(last {days_back} days)"
        )
        return result
