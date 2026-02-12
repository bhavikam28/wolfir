"""Pre-computed orchestration results for instant demo (no Bedrock calls)."""
import uuid
from typing import Dict, Any

# Shared timeline structure matching demoAnalysisData
DEMO_TIMELINE = {
    "events": [
        {"timestamp": "2025-01-15T14:23:00Z", "actor": "admin@company.com", "action": "CreateRole", "resource": "IAM Role: contractor-temp", "severity": "MEDIUM", "details": "Created a temporary role with AdministratorAccess", "significance": "Initial setup"},
        {"timestamp": "2025-01-18T09:45:00Z", "actor": "admin@company.com", "action": "AttachRolePolicy", "resource": "IAM Role: contractor-temp", "severity": "HIGH", "details": "Attached AdministratorAccess policy", "significance": "Overly permissive"},
        {"timestamp": "2025-01-19T04:00:00Z", "actor": "contractor-session", "action": "AuthorizeSecurityGroupIngress", "resource": "Security Group: sg-abc123", "severity": "HIGH", "details": "Opened SSH from 0.0.0.0/0", "significance": "Exposed access"},
        {"timestamp": "2025-01-19T04:38:00Z", "actor": "attacker-session", "action": "DescribeInstances", "resource": "EC2 Instances", "severity": "MEDIUM", "details": "Enumerated EC2 instances", "significance": "Reconnaissance"},
        {"timestamp": "2025-01-19T04:53:00Z", "actor": "attacker-session", "action": "RunInstances", "resource": "EC2 Instances", "severity": "HIGH", "details": "Launched GPU instances for crypto mining", "significance": "Resource abuse"},
        {"timestamp": "2025-02-04T08:23:00Z", "actor": "guardduty.amazonaws.com", "action": "GuardDutyFinding", "resource": "EC2 Instance: i-abc123", "severity": "CRITICAL", "details": "Detected cryptocurrency mining", "significance": "Confirmed malicious activity"},
    ],
    "root_cause": "IAM role with excessive privileges (AdministratorAccess) was created for a contractor and later assumed by an attacker.",
    "attack_pattern": "Privilege escalation via IAM role assumption, followed by reconnaissance, lateral movement, and crypto mining deployment.",
    "blast_radius": "Compromised IAM role, EC2 instances, modified security groups. Impact includes resource abuse and crypto mining.",
    "confidence": 0.95,
    "analysis_summary": "Compromised IAM role used to launch crypto mining instances. Attack involved privilege escalation and resource abuse over ~20 days.",
}

DEMO_REMEDIATION = {
    "steps": [
        {"order": 1, "action": "Revoke IAM role session", "severity": "CRITICAL", "details": "Revoke active sessions for contractor-temp role"},
        {"order": 2, "action": "Detach AdministratorAccess", "severity": "CRITICAL", "details": "Remove overly permissive policy from role"},
        {"order": 3, "action": "Terminate suspicious EC2 instances", "severity": "HIGH", "details": "Stop and terminate mining instances"},
        {"order": 4, "action": "Restore security group rules", "severity": "HIGH", "details": "Remove 0.0.0.0/0 SSH access"},
        {"order": 5, "action": "Enable MFA for IAM", "severity": "MEDIUM", "details": "Require MFA for sensitive operations"},
    ],
    "estimated_time_minutes": 15,
}

DEMO_RISK_SCORES = [
    {"event": "CreateRole", "risk_score": 45, "severity": "MEDIUM"},
    {"event": "AttachRolePolicy", "risk_score": 78, "severity": "HIGH"},
    {"event": "AuthorizeSecurityGroupIngress", "risk_score": 85, "severity": "HIGH"},
    {"event": "RunInstances", "risk_score": 92, "severity": "HIGH"},
    {"event": "GuardDutyFinding", "risk_score": 98, "severity": "CRITICAL"},
]


def get_quick_demo_result(scenario_id: str, incident_type: str) -> Dict[str, Any]:
    """Return pre-computed orchestration result for instant demo (no Bedrock)."""
    incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
    return {
        "incident_id": incident_id,
        "status": "completed",
        "analysis_time_ms": 1800,
        "agents": {
            "temporal": {"status": "COMPLETED", "model": "amazon.nova-2-lite-v1:0"},
            "risk_scorer": {"status": "COMPLETED", "model": "amazon.nova-micro-v1:0"},
            "remediation": {"status": "COMPLETED", "model": "amazon.nova-2-lite-v1:0"},
            "documentation": {"status": "COMPLETED", "model": "amazon.nova-2-lite-v1:0"},
        },
        "results": {
            "timeline": DEMO_TIMELINE,
            "risk_scores": DEMO_RISK_SCORES,
            "remediation_plan": DEMO_REMEDIATION,
            "documentation": {"summary": f"Incident {incident_id} — {incident_type}", "jira_ready": True},
        },
        "model_used": "quick-demo (pre-computed)",
        "metadata": {"scenario": scenario_id, "quick_demo": True},
    }
