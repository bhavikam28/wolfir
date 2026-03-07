"""
Amazon CloudTrail service for fetching real API events.
Supports multi-region fetch and proper pagination to maximize event retrieval.

Reliability: A short-lived cache (2 min) ensures repeated analyses with the same
params return the same events, so results stay consistent for product reliability.
"""
import asyncio
import boto3
import threading
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger

# Cache for CloudTrail events: key=(days_back, max_results, profile), value=(events, timestamp)
# TTL 2 minutes — repeated analyses with same params get identical events for reliability
_CLOUDTRAIL_CACHE: Dict[Tuple[int, int, str], Tuple[List[Dict[str, Any]], float]] = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 120

# Pagination and rate limiting constants (avoid magic numbers)
CLOUDTRAIL_EVENTS_PER_PAGE = 50  # LookupEvents API max per call
CLOUDTRAIL_MAX_PAGES_PER_REGION = 20  # 20 * 50 = 1000 events max per region
CLOUDTRAIL_PAGE_DELAY_SEC = 0.6  # Rate limit between paginated requests
CLOUDTRAIL_REGION_DELAY_SEC = 0.5  # Delay between regions

# Common regions to query — CloudTrail LookupEvents is per-region
# Includes US, EU, and Asia-Pacific; set CLOUDTRAIL_REGIONS env var to override (comma-separated)
DEFAULT_REGIONS = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-central-1", "eu-north-1",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
]

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


def _get_cloudtrail_client(session: boto3.Session, region: str, target_role_arn: Optional[str] = None):
    """Create CloudTrail client, optionally using AssumeRole credentials."""
    if target_role_arn:
        sts = session.client('sts', region_name=region)
        assumed = sts.assume_role(
            RoleArn=target_role_arn,
            RoleSessionName="nova-sentinel-cloudtrail",
        )
        creds = assumed['Credentials']
        return boto3.client(
            'cloudtrail',
            region_name=region,
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'],
        )
    return session.client('cloudtrail', region_name=region)


class CloudTrailService:
    """Service for fetching real CloudTrail events.
    
    Enterprise support:
    - org_trail: Query organization trail in management account (org-wide events)
    - target_role_arn: AssumeRole to member account for cross-account analysis
    """
    
    def __init__(
        self,
        profile: Optional[str] = None,
        target_role_arn: Optional[str] = None,
        org_trail: bool = False,
    ):
        self.settings = get_settings()
        _role = (target_role_arn or self.settings.aws_target_role_arn or "").strip()
        self.target_role_arn = _role if _role else None
        self.org_trail = org_trail
        
        # Use provided profile, or fall back to settings, or default
        profile_to_use = profile or self.settings.aws_profile or "default"
        self.profile = profile_to_use
        
        # Create session with profile if specified
        if profile_to_use and profile_to_use != "default":
            self.session = boto3.Session(profile_name=profile_to_use)
            logger.info(f"Using AWS profile: {profile_to_use} for CloudTrail")
        else:
            self.session = boto3.Session()
            logger.info("Using default AWS credentials for CloudTrail")
        
        # Resolve region: org trail uses management account (no AssumeRole)
        if org_trail:
            self._org_trail_region = self._resolve_org_trail_region()
            self.client = _get_cloudtrail_client(
                self.session, self._org_trail_region, None  # Org trail: management account only
            )
            logger.info(f"CloudTrail client initialized for org trail (region={self._org_trail_region})")
        else:
            self._org_trail_region = None
            self.client = _get_cloudtrail_client(
                self.session, self.settings.aws_region, self.target_role_arn
            )
            logger.info(f"CloudTrail client initialized for region: {self.settings.aws_region}")
    
    def _resolve_org_trail_region(self) -> str:
        """Find organization trail and return its home region. Org trail is in management account."""
        try:
            # Org trail is visible from management account; use base session (no AssumeRole)
            ct = self.session.client('cloudtrail', region_name=self.settings.aws_region)
            trails = ct.describe_trails(includeShadowTrails=False)
            for t in trails.get('trailList', []):
                if t.get('IsOrganizationTrail'):
                    region = t.get('HomeRegion', 'us-east-1')
                    logger.info(f"Org trail found: HomeRegion={region}")
                    return region
        except ClientError as e:
            logger.warning(f"Could not find org trail: {e}. Using us-east-1.")
        return "us-east-1"  # AWS: Org activity viewable in us-east-1
    
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
        # Org trail: no AssumeRole (management account only)
        role = None if self.org_trail else self.target_role_arn
        client = _get_cloudtrail_client(self.session, region, role)
        all_events = []
        next_token = None
        pages = 0
        try:
            while len(all_events) < max_per_region and pages < CLOUDTRAIL_MAX_PAGES_PER_REGION:
                params = {
                    'StartTime': start_time,
                    'EndTime': end_time,
                    'MaxResults': CLOUDTRAIL_EVENTS_PER_PAGE,
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
                await asyncio.sleep(CLOUDTRAIL_PAGE_DELAY_SEC)
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
        Uses a 2-minute cache so repeated analyses with same params return identical events.
        """
        cache_key = (days_back, max_results, self.profile, self.org_trail, self.target_role_arn or "")
        with _CACHE_LOCK:
            if cache_key in _CLOUDTRAIL_CACHE:
                cached_events, cached_at = _CLOUDTRAIL_CACHE[cache_key]
                if time.time() - cached_at < _CACHE_TTL_SECONDS:
                    logger.info(f"CloudTrail cache hit: {len(cached_events)} events (same params within {_CACHE_TTL_SECONDS}s)")
                    return cached_events

        start_time = datetime.utcnow() - timedelta(days=days_back)
        end_time = datetime.utcnow()
        # Org trail: query only the org trail's home region (org-wide events)
        if self.org_trail and self._org_trail_region:
            regions_to_query = [self._org_trail_region]
        elif regions:
            regions_to_query = regions
        else:
            custom = (self.settings.cloudtrail_regions or "").strip()
            regions_to_query = [r.strip() for r in custom.split(",") if r.strip()] if custom else DEFAULT_REGIONS
        per_region = max(CLOUDTRAIL_EVENTS_PER_PAGE, (max_results // len(regions_to_query)) + 20)
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
                await asyncio.sleep(CLOUDTRAIL_REGION_DELAY_SEC)
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
                await asyncio.sleep(CLOUDTRAIL_REGION_DELAY_SEC)
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

        with _CACHE_LOCK:
            _CLOUDTRAIL_CACHE[cache_key] = (result, time.time())

        return result
