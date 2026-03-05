"""
Pre-filter CloudTrail events before temporal analysis.
Filters out routine/benign events to avoid hallucinated incident narratives.
"""
from typing import List, Dict, Any
from utils.logger import logger

# Event names that are almost always routine/benign (logging, service churn, etc.)
ROUTINE_EVENT_NAMES = frozenset({
    "PutLogEvents",
    "CreateLogStream",
    "CreateLogGroup",
    "DescribeLogStreams",
    "GetLogEvents",
    "FilterLogEvents",
    "DescribeLogGroups",
    "PutMetricData",
    "GetMetricData",
    "ListMetrics",
    "DescribeAlarms",
    "GetDashboard",
    "ListDashboards",
    "DescribeLogGroups",
    "DescribeLogStreams",
    "GetLogGroupFields",
    "StartQuery",
    "StopQuery",
    "GetQueryResults",
    "DescribeQueries",
    "GetParameter",  # SSM read - often routine
    "GetParameters",
    "GetParametersByPath",
    "DescribeParameters",
    "ListTagsForResource",  # read-only, routine
    "GetBucketLocation",  # S3 routine read
    "GetBucketVersioning",
    "GetBucketPolicy",
    "GetBucketAcl",
    "HeadBucket",
    "ListBuckets",
    "ListObjectsV2",
    "ListObjects",
    # GetObject, DescribeInstances, ListUsers — security-relevant (exfil, recon); NOT filtered
    "DescribeRegions",
    "DescribeAvailabilityZones",
    "DescribeAccountAttributes",
    "ListAccountAliases",
    "GetAccountSummary",
    "ListRoles",
    "ListUsers",
    "ListGroups",
    "ListPolicies",
    "GetRole",
    "GetUser",
    "ListAttachedRolePolicies",
    "ListAttachedUserPolicies",
    "GetPolicy",
    "GetPolicyVersion",
    "DescribeStacks",
    "DescribeStackEvents",
    "DescribeStackResources",
    "ListStackResources",
    "ValidateTemplate",
    "DescribeChangeSet",
    "ListChangeSets",
    "DescribeStacks",
    "GetTemplate",
    "DescribeStackDriftDetectionStatus",
    "DescribeStackResourceDrifts",
    "BatchGetItem",
    "Query",
    "Scan",
    "DescribeTable",
    "ListTables",
    "DescribeDBInstances",
    "DescribeDBClusters",
    "DescribeClusters",
    "ListClusters",
    "DescribeTaskDefinition",
    "ListTaskDefinitions",
    "DescribeServices",
    "ListServices",
    "DescribeTasks",
    "ListTasks",
})


def _is_aws_service_principal(event: Dict[str, Any]) -> bool:
    """Check if the event was performed by an AWS service (Lambda, ECS, etc.)."""
    ui = event.get("userIdentity") or event.get("user", {})
    if not isinstance(ui, dict):
        return False
    # AssumedRole invoked by AWS service
    invoker = (ui.get("sessionContext") or {}).get("sessionIssuer") or {}
    if isinstance(invoker, dict):
        principal = invoker.get("principalId", "") or invoker.get("arn", "") or ""
        if "amazonaws.com" in str(principal) or ":aws:" in str(principal):
            return True
    # Direct AWS service principal
    if ui.get("type") == "AWSService":
        return True
    if "amazonaws.com" in str(ui.get("arn", "")):
        return True
    return False


def _get_event_name(event: Dict[str, Any]) -> str:
    """Extract event name from CloudTrail event."""
    name = event.get("eventName") or event.get("event_name") or event.get("EventName", "")
    if name:
        return name
    # CloudTrailEvent JSON string
    ct = event.get("CloudTrailEvent")
    if isinstance(ct, str):
        try:
            import json
            parsed = json.loads(ct)
            return parsed.get("eventName", "") if isinstance(parsed, dict) else ""
        except Exception:
            pass
    return ""


def _is_routine_assume_role(event: Dict[str, Any]) -> bool:
    """AssumeRole from AWS service (Lambda, ECS, etc.) is routine."""
    name = _get_event_name(event)
    if name != "AssumeRole":
        return False
    return _is_aws_service_principal(event)


def filter_interesting_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter out routine/benign events before sending to temporal analysis.
    Returns only events that may be security-relevant.

    Filters:
    - Routine event names (PutLogEvents, CreateLogStream, etc.)
    - AssumeRole from AWS services (Lambda, ECS execution roles)
    """
    if not events:
        return []

    interesting = []
    for event in events:
        name = _get_event_name(event)
        if not name:
            interesting.append(event)  # Keep unknown events
            continue
        # Skip routine event names
        if name in ROUTINE_EVENT_NAMES:
            continue
        # Skip AssumeRole from AWS services
        if _is_routine_assume_role(event):
            continue
        interesting.append(event)

    filtered_count = len(events) - len(interesting)
    if filtered_count > 0:
        logger.info(f"Filtered {filtered_count} routine events, {len(interesting)} interesting remain")
    return interesting
