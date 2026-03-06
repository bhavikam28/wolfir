/**
 * Hardcoded Demo Analysis Data
 * Used for reliable demo when backend is offline (no API dependency)
 */
import type { AnalysisResponse } from '../types/incident';

export const demoAnalysisData: AnalysisResponse = {
  incident_id: "INC-44677D",
  timeline: {
    events: [
      {
        timestamp: "2026-01-15T14:23:00Z",
        actor: "admin@company.com",
        action: "CreateRole",
        resource: "IAM Role: contractor-temp",
        severity: "MEDIUM",
        details: "Created a temporary role for contractor work with AdministratorAccess policy",
        significance: "Initial setup of a role that could be abused — foundation for privilege escalation.",
      },
      {
        timestamp: "2026-01-18T09:45:00Z",
        actor: "admin@company.com",
        action: "AttachRolePolicy",
        resource: "IAM Role: contractor-temp",
        severity: "HIGH",
        details: "Attached AdministratorAccess managed policy to the role",
        significance: "Attached overly permissive policy",
      },
      {
        timestamp: "2026-01-19T04:00:00Z",
        actor: "contractor-session",
        action: "AuthorizeSecurityGroupIngress",
        resource: "Security Group: sg-abc123",
        severity: "HIGH",
        details: "Modified security group to allow SSH (port 22) from 0.0.0.0/0",
        significance: "Opened SSH access to internet",
      },
      {
        timestamp: "2026-01-19T04:38:00Z",
        actor: "attacker-session",
        action: "DescribeInstances",
        resource: "EC2 Instances",
        severity: "MEDIUM",
        details: "Enumerated all EC2 instances in the account",
        significance: "Reconnaissance activity",
      },
      {
        timestamp: "2026-01-19T04:53:00Z",
        actor: "attacker-session",
        action: "RunInstances",
        resource: "EC2 Instances",
        severity: "HIGH",
        details: "Launched 3 GPU instances for crypto mining",
        significance: "Launched unauthorized instances",
      },
      {
        timestamp: "2026-01-19T10:38:00Z",
        actor: "attacker-session",
        action: "AuthorizeSecurityGroupIngress",
        resource: "Security Group: sg-def456",
        severity: "HIGH",
        details: "Opened additional ports for command and control",
        significance: "Further exposed infrastructure",
      },
      {
        timestamp: "2026-01-19T11:23:00Z",
        actor: "attacker-session",
        action: "CreateAccessKey",
        resource: "IAM User: backup-user",
        severity: "HIGH",
        details: "Created access keys for backup user to maintain access",
        significance: "Created persistence mechanism",
      },
      {
        timestamp: "2026-02-04T08:23:00Z",
        actor: "guardduty.amazonaws.com",
        action: "GuardDutyFinding",
        resource: "EC2 Instance: i-abc123",
        severity: "CRITICAL",
        details: "Detected cryptocurrency mining activity",
        significance: "Confirmed malicious activity on the instance",
      },
    ],
    root_cause: "The initial root cause was the creation of an IAM role with excessive privileges (AdministratorAccess) and the subsequent unauthorized access by an attacker who assumed this role.",
    attack_pattern: "The attack pattern involves privilege escalation through the assumption of an IAM role with excessive permissions, followed by reconnaissance, lateral movement, resource abuse, and the deployment of cryptocurrency mining tools.",
    blast_radius: "The blast radius includes the compromised IAM role, the EC2 instances used by the attacker, and the security group rules modified to allow unauthorized access. The overall impact includes potential data exfiltration, resource abuse, and cryptocurrency mining.",
    confidence: 0.95,
    analysis_summary: "A compromised IAM role with AdministratorAccess was used to launch cryptocurrency mining instances. The attack involved privilege escalation, lateral movement, and resource abuse over a 20-day period before detection.",
  },
  analysis_time_ms: 5800,
  model_used: "amazon.nova-lite-v1:0",
};
