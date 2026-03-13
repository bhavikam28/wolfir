"""Pre-computed orchestration results for instant demo (no Bedrock calls).
Each scenario has distinct timeline, remediation, and risk scores.
"""
import uuid
from typing import Dict, Any

# --- CRYPTO-MINING ---
CRYPTO_TIMELINE = {
    "events": [
        {"timestamp": "2026-01-15T14:23:00Z", "actor": "admin@company.com", "action": "CreateRole", "resource": "IAM Role: contractor-temp", "severity": "MEDIUM", "details": "Created a temporary role with AdministratorAccess policy", "significance": "Foundation for privilege escalation."},
        {"timestamp": "2026-01-18T09:45:00Z", "actor": "admin@company.com", "action": "AttachRolePolicy", "resource": "IAM Role: contractor-temp", "severity": "HIGH", "details": "Attached AdministratorAccess managed policy", "significance": "Enabled full account takeover."},
        {"timestamp": "2026-01-19T04:00:00Z", "actor": "contractor-session", "action": "AuthorizeSecurityGroupIngress", "resource": "Security Group: sg-abc123", "severity": "HIGH", "details": "Modified security group to allow SSH from 0.0.0.0/0", "significance": "Opened initial access vector."},
        {"timestamp": "2026-01-19T04:38:00Z", "actor": "attacker-session", "action": "DescribeInstances", "resource": "EC2 Instances", "severity": "MEDIUM", "details": "Enumerated all EC2 instances", "significance": "Reconnaissance activity."},
        {"timestamp": "2026-01-19T04:53:00Z", "actor": "attacker-session", "action": "RunInstances", "resource": "EC2 Instances", "severity": "HIGH", "details": "Launched 3 GPU instances for crypto mining", "significance": "Resource abuse and impact."},
        {"timestamp": "2026-02-04T08:23:00Z", "actor": "guardduty.amazonaws.com", "action": "GuardDutyFinding", "resource": "EC2 Instance: i-abc123", "severity": "CRITICAL", "details": "Detected cryptocurrency mining activity", "significance": "Confirmed malicious activity."},
    ],
    "root_cause": "IAM role with excessive privileges (AdministratorAccess) was created for a contractor and later assumed by an attacker.",
    "attack_pattern": "Privilege escalation via IAM role assumption, reconnaissance, lateral movement, and crypto mining deployment.",
    "blast_radius": "Compromised IAM role, EC2 instances, modified security groups. Impact includes resource abuse and crypto mining.",
    "confidence": 0.95,
    "analysis_summary": "Compromised IAM role used to launch crypto mining instances over ~20 days.",
}

# --- DATA EXFILTRATION ---
DATA_EXFIL_TIMELINE = {
    "events": [
        {"timestamp": "2026-02-01T10:00:00Z", "actor": "data-analyst", "action": "GetObject", "resource": "S3: company-sensitive-data/customer-pii/database-export.csv", "severity": "HIGH", "details": "Downloaded customer PII database export", "significance": "Initial data exfiltration of sensitive records."},
        {"timestamp": "2026-02-01T10:05:00Z", "actor": "data-analyst", "action": "GetObject", "resource": "S3: company-sensitive-data/financial-records/q4-2024.csv", "severity": "HIGH", "details": "Downloaded financial records", "significance": "Additional sensitive data theft."},
        {"timestamp": "2026-02-01T10:10:00Z", "actor": "data-analyst", "action": "ListBucket", "resource": "S3 Bucket: company-sensitive-data", "severity": "MEDIUM", "details": "Listed bucket contents", "significance": "Reconnaissance to locate more data."},
    ],
    "root_cause": "IAM user data-analyst had excessive S3 read permissions; credentials may have been compromised or misused.",
    "attack_pattern": "Unauthorized access to sensitive S3 data via GetObject and ListBucket from external IP.",
    "blast_radius": "S3 bucket company-sensitive-data, customer PII, financial records. Potential GDPR/privacy breach.",
    "confidence": 0.92,
    "analysis_summary": "Data exfiltration via S3 access. Sensitive PII and financial data downloaded.",
}

# --- PRIVILEGE ESCALATION ---
PRIV_ESCAL_TIMELINE = {
    "events": [
        {"timestamp": "2026-02-10T14:00:00Z", "actor": "junior-dev", "action": "ConsoleLogin", "resource": "AWS Console", "severity": "LOW", "details": "IAM user with limited permissions logged in", "significance": "Initial access as low-privilege user."},
        {"timestamp": "2026-02-10T14:15:00Z", "actor": "junior-dev", "action": "AssumeRole", "resource": "IAM Role: AdminRole", "severity": "CRITICAL", "details": "Assumed AdminRole to gain elevated privileges", "significance": "Privilege escalation via role assumption."},
        {"timestamp": "2026-02-10T14:30:00Z", "actor": "admin-session", "action": "CreateUser", "resource": "IAM User: backdoor-admin", "severity": "HIGH", "details": "Created new IAM user while assuming admin role", "significance": "Persistence mechanism."},
        {"timestamp": "2026-02-10T14:32:00Z", "actor": "admin-session", "action": "AttachUserPolicy", "resource": "IAM User: backdoor-admin", "severity": "CRITICAL", "details": "Attached AdministratorAccess to backdoor-admin", "significance": "Established permanent admin backdoor."},
    ],
    "root_cause": "junior-dev had permission to assume AdminRole; after escalation, created backdoor-admin user with AdministratorAccess.",
    "attack_pattern": "Insider threat — limited user assumed AdminRole, then created backdoor IAM user with full admin access.",
    "blast_radius": "AdminRole trust policy, IAM user backdoor-admin. Full account compromise possible.",
    "confidence": 0.96,
    "analysis_summary": "Privilege escalation from junior-dev to AdminRole, then creation of backdoor-admin.",
}

# --- SHADOW AI / LLM ABUSE ---
SHADOW_AI_TIMELINE = {
    "events": [
        {"timestamp": "2026-03-01T09:00:00Z", "actor": "lambda-shadow-ai (UnapprovedLambdaRole)", "action": "InvokeModel", "resource": "Bedrock: amazon.nova-pro-v1:0", "severity": "HIGH", "details": "Ungoverned InvokeModel from non-approved Lambda role", "significance": "Shadow AI — model access outside approved policy."},
        {"timestamp": "2026-03-01T09:15:00Z", "actor": "lambda-shadow-ai", "action": "InvokeModel", "resource": "Bedrock: amazon.nova-pro-v1:0", "severity": "HIGH", "details": "Repeated InvokeModel calls — potential API abuse", "significance": "High-volume usage from unexpected principal."},
        {"timestamp": "2026-03-01T11:00:00Z", "actor": "dev-experiment", "action": "InvokeModelWithResponseStream", "resource": "Bedrock: amazon.nova-2-lite-v1:0", "severity": "HIGH", "details": "Streaming invocation from external IP 198.51.100.77", "significance": "Potential prompt injection vector — OWASP LLM01."},
        {"timestamp": "2026-03-01T12:30:00Z", "actor": "lambda-shadow-ai", "action": "InvokeModel", "resource": "Bedrock: amazon.nova-pro-v1:0", "severity": "HIGH", "details": "Continued shadow AI usage", "significance": "Persistent ungoverned access."},
        {"timestamp": "2026-03-02T17:00:00Z", "actor": "ai-security.amazonaws.com", "action": "GuardDutyFinding", "resource": "Bedrock: Shadow AI", "severity": "CRITICAL", "details": "Ungoverned Bedrock InvokeModel from non-approved principal — 47 invocations in 24h", "significance": "MITRE ATLAS AML.T0016 (Capability theft), OWASP LLM01."},
    ],
    "root_cause": "Lambda role UnapprovedLambdaRole and IAM user dev-experiment invoked Bedrock models without approval. Shadow AI — ungoverned LLM usage outside policy.",
    "attack_pattern": "Shadow AI / LLM Abuse. Ungoverned InvokeModel from non-approved principals. MITRE ATLAS AML.T0051 (Prompt injection), AML.T0016 (Capability theft). OWASP LLM Top 10.",
    "blast_radius": "Bedrock Nova Pro, Nova 2 Lite. Risk of prompt injection, data exfiltration via model output, cost abuse.",
    "confidence": 0.93,
    "analysis_summary": "Shadow AI detected: ungoverned Bedrock InvokeModel from Lambda and dev user. MITRE ATLAS and OWASP LLM Top 10 alignment.",
}

# --- UNAUTHORIZED ACCESS ---
UNAUTH_ACCESS_TIMELINE = {
    "events": [
        {"timestamp": "2026-02-05T08:00:00Z", "actor": "external-user", "action": "AssumeRole", "resource": "IAM Role (attempt)", "severity": "MEDIUM", "details": "AccessDenied — failed to assume role from external IP", "significance": "Initial failed access attempt."},
        {"timestamp": "2026-02-05T08:05:00Z", "actor": "external-user", "action": "GetObject", "resource": "S3: company-secrets/api-keys/production.env", "severity": "CRITICAL", "details": "Downloaded production API keys", "significance": "Compromised credentials used to access sensitive data."},
        {"timestamp": "2026-02-05T08:10:00Z", "actor": "external-user", "action": "ListBucket", "resource": "S3 Bucket: company-secrets", "severity": "HIGH", "details": "Listed secrets bucket", "significance": "Reconnaissance of sensitive data."},
    ],
    "root_cause": "External actor accessed sensitive resources using compromised credentials for external-user.",
    "attack_pattern": "External unauthorized access. Stolen credentials used to access production secrets.",
    "blast_radius": "S3 bucket company-secrets, production API keys. Risk of account takeover.",
    "confidence": 0.94,
    "analysis_summary": "External actor with compromised credentials accessed production secrets.",
}

# Fallback for backward compatibility
DEMO_TIMELINE = CRYPTO_TIMELINE

SCENARIO_DATA: Dict[str, Dict[str, Any]] = {
    "crypto-mining": {
        "timeline": CRYPTO_TIMELINE,
        "risk_scores": [
            {"event": "CreateRole", "risk_score": 45, "severity": "MEDIUM"},
            {"event": "AttachRolePolicy", "risk_score": 78, "severity": "HIGH"},
            {"event": "AuthorizeSecurityGroupIngress", "risk_score": 85, "severity": "HIGH"},
            {"event": "RunInstances", "risk_score": 92, "severity": "HIGH"},
            {"event": "GuardDutyFinding", "risk_score": 98, "severity": "CRITICAL"},
        ],
        "remediation": {
            "steps": [
                {"order": 1, "action": "Revoke IAM role session", "target": "contractor-temp", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Revoke sessions", "reason": "Remove compromised sessions.", "risk_if_skipped": "Attacker retains admin.", "api_call": "aws iam list-role-policies --role-name contractor-temp", "automation": "manual"},
                {"order": 2, "action": "Detach AdministratorAccess", "target": "contractor-temp", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Remove policy", "reason": "Eliminate admin access.", "risk_if_skipped": "Continued exploitation.", "api_call": "aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess", "automation": "manual"},
                {"order": 3, "action": "Terminate suspicious EC2 instances", "target": "i-abc123, i-xyz789", "severity": "HIGH", "risk": "HIGH", "details": "Stop mining instances", "reason": "Stop crypto-mining.", "risk_if_skipped": "Ongoing costs.", "api_call": "aws ec2 terminate-instances --instance-ids i-abc123 i-xyz789", "automation": "automated"},
                {"order": 4, "action": "Restore security group rules", "target": "sg-abc123, sg-def456", "severity": "HIGH", "risk": "HIGH", "details": "Remove 0.0.0.0/0 SSH", "reason": "Close exposed ports.", "risk_if_skipped": "Ports remain open.", "api_call": "aws ec2 revoke-security-group-ingress --group-id sg-abc123 --protocol tcp --port 22 --cidr 0.0.0.0/0", "automation": "automated"},
                {"order": 5, "action": "Enable MFA for IAM", "target": "All IAM users", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Require MFA", "reason": "Prevent credential theft.", "risk_if_skipped": "Theft remains viable.", "api_call": "aws iam enable-mfa-device", "automation": "manual"},
            ],
            "estimated_time_minutes": 15,
            "impact_assessment": {"resources_affected": 5, "iam_policies_to_modify": 2},
        },
    },
    "data-exfiltration": {
        "timeline": DATA_EXFIL_TIMELINE,
        "risk_scores": [
            {"event": "GetObject", "risk_score": 88, "severity": "HIGH"},
            {"event": "GetObject", "risk_score": 92, "severity": "HIGH"},
            {"event": "ListBucket", "risk_score": 65, "severity": "MEDIUM"},
        ],
        "remediation": {
            "steps": [
                {"order": 1, "action": "Disable data-analyst access keys", "target": "data-analyst", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Revoke credentials", "reason": "Block exfiltration.", "risk_if_skipped": "Ongoing theft.", "api_call": "aws iam list-access-keys --user-name data-analyst", "automation": "manual"},
                {"order": 2, "action": "Enable S3 bucket blocking", "target": "company-sensitive-data", "severity": "HIGH", "risk": "HIGH", "details": "Block public access", "reason": "Prevent further access.", "risk_if_skipped": "More theft.", "api_call": "aws s3api put-public-access-block --bucket company-sensitive-data", "automation": "automated"},
                {"order": 3, "action": "Audit S3 access", "target": "company-sensitive-data", "severity": "HIGH", "risk": "HIGH", "details": "Apply least privilege", "reason": "Review permissions.", "risk_if_skipped": "Over-permissioned.", "api_call": "aws s3api get-bucket-policy", "automation": "manual"},
                {"order": 4, "action": "Enable CloudTrail S3 data events", "target": "S3", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Improve detection", "reason": "Future visibility.", "risk_if_skipped": "Delayed detection.", "api_call": "aws cloudtrail put-event-selectors", "automation": "automated"},
            ],
            "estimated_time_minutes": 15,
            "impact_assessment": {"resources_affected": 4, "iam_policies_to_modify": 1},
        },
    },
    "privilege-escalation": {
        "timeline": PRIV_ESCAL_TIMELINE,
        "risk_scores": [
            {"event": "ConsoleLogin", "risk_score": 25, "severity": "LOW"},
            {"event": "AssumeRole", "risk_score": 95, "severity": "CRITICAL"},
            {"event": "CreateUser", "risk_score": 88, "severity": "HIGH"},
            {"event": "AttachUserPolicy", "risk_score": 98, "severity": "CRITICAL"},
        ],
        "remediation": {
            "steps": [
                {"order": 1, "action": "Delete backdoor-admin user", "target": "backdoor-admin", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Remove persistence", "reason": "Remove backdoor.", "risk_if_skipped": "Attacker retains admin.", "api_call": "aws iam delete-user --user-name backdoor-admin", "automation": "manual"},
                {"order": 2, "action": "Restrict AdminRole assumption", "target": "AdminRole", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Update trust policy", "reason": "Prevent escalation.", "risk_if_skipped": "Escalation can repeat.", "api_call": "aws iam update-assume-role-policy", "automation": "manual"},
                {"order": 3, "action": "Revoke junior-dev sessions", "target": "junior-dev", "severity": "HIGH", "risk": "HIGH", "details": "End active session", "reason": "Kill session.", "risk_if_skipped": "Active session.", "api_call": "aws iam list-access-keys --user-name junior-dev", "automation": "manual"},
                {"order": 4, "action": "Enable MFA for sensitive roles", "target": "All IAM users", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Enforce MFA", "reason": "Future prevention.", "risk_if_skipped": "Easier escalation.", "api_call": "aws iam enable-mfa-device", "automation": "manual"},
            ],
            "estimated_time_minutes": 15,
            "impact_assessment": {"resources_affected": 4, "iam_policies_to_modify": 2},
        },
    },
    "unauthorized-access": {
        "timeline": UNAUTH_ACCESS_TIMELINE,
        "risk_scores": [
            {"event": "AssumeRole (failed)", "risk_score": 45, "severity": "MEDIUM"},
            {"event": "GetObject", "risk_score": 96, "severity": "CRITICAL"},
            {"event": "ListBucket", "risk_score": 72, "severity": "HIGH"},
        ],
        "remediation": {
            "steps": [
                {"order": 1, "action": "Revoke external-user credentials", "target": "external-user", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Credentials compromised", "reason": "Block access.", "risk_if_skipped": "Continued access.", "api_call": "aws iam delete-access-key", "automation": "manual"},
                {"order": 2, "action": "Rotate production API keys", "target": "production.env", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Keys exfiltrated", "reason": "Prevent takeover.", "risk_if_skipped": "Account takeover.", "api_call": "Manual key rotation", "automation": "manual"},
                {"order": 3, "action": "Restrict company-secrets bucket", "target": "company-secrets", "severity": "HIGH", "risk": "HIGH", "details": "Least privilege", "reason": "Limit access.", "risk_if_skipped": "Future exfil.", "api_call": "aws s3api get-bucket-policy", "automation": "manual"},
                {"order": 4, "action": "Block malicious IP", "target": "WAF/SG", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Block 198.51.100.100", "reason": "Known bad IP.", "risk_if_skipped": "IP may retry.", "api_call": "Add to WAF block", "automation": "automated"},
            ],
            "estimated_time_minutes": 15,
            "impact_assessment": {"resources_affected": 4, "iam_policies_to_modify": 1},
        },
    },
    "shadow-ai": {
        "timeline": SHADOW_AI_TIMELINE,
        "risk_scores": [
            {"event": "InvokeModel (shadow)", "risk_score": 82, "severity": "HIGH"},
            {"event": "InvokeModel (shadow)", "risk_score": 85, "severity": "HIGH"},
            {"event": "InvokeModelWithResponseStream", "risk_score": 78, "severity": "HIGH"},
            {"event": "InvokeModel (shadow)", "risk_score": 88, "severity": "HIGH"},
            {"event": "GuardDutyFinding", "risk_score": 96, "severity": "CRITICAL"},
        ],
        "remediation": {
            "steps": [
                {"order": 1, "action": "Revoke UnapprovedLambdaRole Bedrock access", "target": "UnapprovedLambdaRole", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Remove bedrock:InvokeModel", "reason": "Stop shadow AI.", "risk_if_skipped": "Continued ungoverned access.", "api_call": "aws iam detach-role-policy --role-name UnapprovedLambdaRole", "automation": "manual"},
                {"order": 2, "action": "Audit dev-experiment IAM user", "target": "dev-experiment", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Review Bedrock permissions", "reason": "Prompt injection risk.", "risk_if_skipped": "OWASP LLM01.", "api_call": "aws iam list-attached-user-policies --user-name dev-experiment", "automation": "manual"},
                {"order": 3, "action": "Enable Bedrock Guardrails", "target": "Bedrock", "severity": "HIGH", "risk": "HIGH", "details": "Content filters, prompt attack blocking", "reason": "Block injection.", "risk_if_skipped": "OWASP LLM01.", "api_call": "aws bedrock create-guardrail", "automation": "manual"},
                {"order": 4, "action": "Add CloudTrail data events for Bedrock", "target": "CloudTrail", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Full audit trail", "reason": "Compliance.", "risk_if_skipped": "Limited visibility.", "api_call": "aws cloudtrail put-event-selectors", "automation": "automated"},
            ],
            "estimated_time_minutes": 15,
            "impact_assessment": {"resources_affected": 4, "iam_policies_to_modify": 2},
        },
    },
}

# Legacy fallbacks
DEMO_REMEDIATION = SCENARIO_DATA["crypto-mining"]["remediation"]
DEMO_RISK_SCORES = SCENARIO_DATA["crypto-mining"]["risk_scores"]


def _build_demo_documentation(incident_id: str, incident_type: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
    """Build realistic JIRA/Slack/Confluence content for demo (replaces placeholder text)."""
    timeline = scenario.get("timeline", {})
    root_cause = timeline.get("root_cause", "Security incident detected.")
    attack_pattern = timeline.get("attack_pattern", "See timeline for details.")
    blast_radius = timeline.get("blast_radius", "Unknown.")
    events = timeline.get("events", [])
    steps = scenario.get("remediation", {}).get("steps", [])
    step_list = "\n".join(f"- {s.get('action', 'Unknown')} ({s.get('severity', 'MEDIUM')})" for s in steps) or "- Review incident and remediate"
    event_lines = "\n".join(
        f"* {e.get('timestamp', 'N/A')} — {e.get('action', 'Event')} (Severity: {e.get('severity', 'N/A')})"
        for i, e in enumerate(events[:8])
    ) or "No events recorded"
    return {
        "documentation": {
            "jira": {
                "title": f"SEC-{incident_id}",
                "content": f"""[SEC] Security Incident {incident_id}

**Summary:** {root_cause}

**Priority:** Critical
**Labels:** security, incident, aws
**Affected Resources:** See timeline for impacted IAM, EC2, Security Groups
**Root Cause:** {root_cause}
**Attack Pattern:** {attack_pattern}
**Blast Radius:** {blast_radius}

**Remediation Steps:**
{step_list}

**Assignee:** Security Team""",
            },
            "slack": {
                "title": "Security Incident Report",
                "content": f"""*Security Incident Report — {incident_id}*

*Classification:* Critical
*Channel:* #security-incidents

*Executive Summary*
{root_cause[:280]}{'…' if len(root_cause) > 280 else ''}

*Incident Type:* {incident_type}

*Attack Pattern*
{attack_pattern[:180]}{'…' if len(attack_pattern) > 180 else ''}

*Blast Radius*
{blast_radius[:150]}{'…' if len(blast_radius) > 150 else ''}

*Remediation*
{len(steps)} steps identified. Full details in wolfir.

*Link*
<https://wolfir.app/incidents/{incident_id}|View in wolfir>""",
            },
            "confluence": {
                "title": f"Incident Postmortem: {incident_id}",
                "content": f"""h1. Incident Postmortem: {incident_id}

h2. Executive Summary
Security incident {incident_id} was identified and analyzed. Root cause: {root_cause[:120]}{'…' if len(root_cause) > 120 else ''}

h2. Timeline
{event_lines}

h2. Impact Analysis
*Blast Radius:* {blast_radius}
*Attack Pattern:* {attack_pattern}

h2. Remediation Steps
{step_list}

h2. Lessons Learned
* Review least privilege for contractor and external roles
* Enforce MFA for sensitive operations
* Monitor security group and IAM policy changes
* Document incident timeline for audit trail""",
            },
        }
    }


def _enrich_step_classification(step: Dict[str, Any]) -> Dict[str, Any]:
    """Add classification and reversible if missing."""
    if step.get("classification"):
        return step
    action = (step.get("action", "") or "").lower()
    automation = (step.get("automation", "") or "").lower()
    if automation == "automated":
        step["classification"] = "AUTO"
    elif "delete" in action or "terminate" in action:
        step["classification"] = "MANUAL"
    else:
        step["classification"] = "APPROVAL"
    step.setdefault("reversible", True)
    step.setdefault("rollback_command", step.get("api_call", ""))
    return step


def get_quick_demo_result(scenario_id: str, incident_type: str) -> Dict[str, Any]:
    """Return pre-computed orchestration result for instant demo (no Bedrock)."""
    scenario = SCENARIO_DATA.get(scenario_id, SCENARIO_DATA["crypto-mining"])
    incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
    return {
        "incident_id": incident_id,
        "status": "completed",
        "analysis_time_ms": 1800,
        "agents": {
            "temporal": {"status": "COMPLETED", "model": "amazon.nova-2-lite-v1:0"},
            "risk_scorer": {"status": "COMPLETED", "model": "amazon.nova-micro-v1:0"},
            "remediation": {"status": "COMPLETED", "model": "amazon.nova-2-lite-v1:0"},
            "documentation": {"status": "COMPLETED", "model": "amazon.nova-micro-v1:0"},
        },
        "results": {
            "timeline": scenario["timeline"],
            "risk_scores": scenario["risk_scores"],
            "remediation_plan": {
                **scenario["remediation"],
                "steps": [_enrich_step_classification(dict(s)) for s in scenario["remediation"]["steps"]],
            },
            "documentation": _build_demo_documentation(incident_id, incident_type, scenario),
        },
        "model_used": "quick-demo (pre-computed)",
        "metadata": {"scenario": scenario_id, "quick_demo": True, "incident_type": incident_type},
    }
