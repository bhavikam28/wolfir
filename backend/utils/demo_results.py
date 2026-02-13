"""Pre-computed orchestration results for instant demo (no Bedrock calls)."""
import uuid
from typing import Dict, Any

# Shared timeline structure matching demoAnalysisData - ALL events have significance
DEMO_TIMELINE = {
    "events": [
        {"timestamp": "2025-01-15T14:23:00Z", "actor": "admin@company.com", "action": "CreateRole", "resource": "IAM Role: contractor-temp", "severity": "MEDIUM", "details": "Created a temporary role with AdministratorAccess policy", "significance": "Initial setup of a role that could be abused — foundation for privilege escalation."},
        {"timestamp": "2025-01-18T09:45:00Z", "actor": "admin@company.com", "action": "AttachRolePolicy", "resource": "IAM Role: contractor-temp", "severity": "HIGH", "details": "Attached AdministratorAccess managed policy to the role", "significance": "Attached overly permissive policy — enabled full account takeover."},
        {"timestamp": "2025-01-19T04:00:00Z", "actor": "contractor-session", "action": "AuthorizeSecurityGroupIngress", "resource": "Security Group: sg-abc123", "severity": "HIGH", "details": "Modified security group to allow SSH from 0.0.0.0/0", "significance": "Opened SSH access to internet — initial access vector."},
        {"timestamp": "2025-01-19T04:38:00Z", "actor": "attacker-session", "action": "DescribeInstances", "resource": "EC2 Instances", "severity": "MEDIUM", "details": "Enumerated all EC2 instances in the account", "significance": "Reconnaissance activity — attacker mapping infrastructure."},
        {"timestamp": "2025-01-19T04:53:00Z", "actor": "attacker-session", "action": "RunInstances", "resource": "EC2 Instances", "severity": "HIGH", "details": "Launched 3 GPU instances for crypto mining", "significance": "Launched unauthorized instances — resource abuse and impact."},
        {"timestamp": "2025-01-19T10:38:00Z", "actor": "attacker-session", "action": "AuthorizeSecurityGroupIngress", "resource": "Security Group: sg-def456", "severity": "HIGH", "details": "Opened additional ports for command and control", "significance": "Further exposed infrastructure — lateral movement and C2."},
        {"timestamp": "2025-01-19T11:23:00Z", "actor": "attacker-session", "action": "CreateAccessKey", "resource": "IAM User: backup-user", "severity": "HIGH", "details": "Created access keys for backup user to maintain access", "significance": "Created persistence mechanism — backdoor for continued access."},
        {"timestamp": "2025-02-04T08:23:00Z", "actor": "guardduty.amazonaws.com", "action": "GuardDutyFinding", "resource": "EC2 Instance: i-abc123", "severity": "CRITICAL", "details": "Detected cryptocurrency mining activity", "significance": "Confirmed malicious activity on the instance — detection triggered."},
    ],
    "root_cause": "IAM role with excessive privileges (AdministratorAccess) was created for a contractor and later assumed by an attacker.",
    "attack_pattern": "Privilege escalation via IAM role assumption, followed by reconnaissance, lateral movement, and crypto mining deployment.",
    "blast_radius": "Compromised IAM role, EC2 instances, modified security groups. Impact includes resource abuse and crypto mining.",
    "confidence": 0.95,
    "analysis_summary": "Compromised IAM role used to launch crypto mining instances. Attack involved privilege escalation and resource abuse over ~20 days.",
}

DEMO_REMEDIATION = {
    "steps": [
        {"order": 1, "action": "Revoke IAM role session", "target": "contractor-temp", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Revoke active sessions for contractor-temp role", "reason": "Remove active compromised sessions immediately to block attacker access.", "risk_if_skipped": "Attacker retains admin access to all AWS resources.", "api_call": "aws sts get-caller-identity --profile default\naws iam list-role-policies --role-name contractor-temp", "automation": "manual"},
        {"order": 2, "action": "Detach AdministratorAccess", "target": "contractor-temp", "severity": "CRITICAL", "risk": "CRITICAL", "details": "Remove overly permissive policy from role", "reason": "Eliminate full admin access — attacker currently has unrestricted AWS access.", "risk_if_skipped": "Attacker can continue to create resources and exfiltrate data.", "api_call": "aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess", "automation": "manual"},
        {"order": 3, "action": "Terminate suspicious EC2 instances", "target": "i-abc123, i-xyz789", "severity": "HIGH", "risk": "HIGH", "details": "Stop and terminate mining instances", "reason": "Stop crypto-mining activity and prevent further resource abuse.", "risk_if_skipped": "Ongoing crypto-mining costs and potential lateral movement.", "api_call": "aws ec2 terminate-instances --instance-ids i-abc123 i-xyz789", "automation": "automated"},
        {"order": 4, "action": "Restore security group rules", "target": "sg-abc123, sg-def456", "severity": "HIGH", "risk": "HIGH", "details": "Remove 0.0.0.0/0 SSH access", "reason": "Close SSH and C2 ports that allowed initial access and lateral movement.", "risk_if_skipped": "Exposed ports remain open for future exploitation.", "api_call": "aws ec2 revoke-security-group-ingress --group-id sg-abc123 --protocol tcp --port 22 --cidr 0.0.0.0/0", "automation": "automated"},
        {"order": 5, "action": "Enable MFA for IAM", "target": "All IAM users", "severity": "MEDIUM", "risk": "MEDIUM", "details": "Require MFA for sensitive operations", "reason": "Prevent future compromise via stolen credentials.", "risk_if_skipped": "Credential theft remains a viable attack vector.", "api_call": "aws iam enable-mfa-device --user-name <USER> --serial-number <MFA_ARN> --authentication-code1 <CODE1> --authentication-code2 <CODE2>", "automation": "manual"},
    ],
    "estimated_time_minutes": 15,
    "impact_assessment": {"resources_affected": 5, "iam_policies_to_modify": 2},
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
