/**
 * Client-side instant demo — no API call, no backend dependency.
 * Used when "Use full AI analysis" is OFF for truly instant demo (~0ms).
 */
import type { OrchestrationResponse } from '../types/incident';
import { demoAnalysisData } from './demoAnalysis';

function makeId(): string {
  return 'INC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getQuickDemoResult(scenarioId: string): OrchestrationResponse {
  const incidentId = makeId();
  const timeline = demoAnalysisData.timeline;
  const rootCause = timeline?.root_cause || 'IAM role with excessive privileges was compromised.';
  const attackPattern = timeline?.attack_pattern || 'Privilege escalation and resource abuse.';
  const steps = [
    { order: 1, action: 'Revoke IAM role session', severity: 'CRITICAL', risk: 'CRITICAL', target: 'contractor-temp', reason: 'Remove active compromised sessions immediately to block attacker access.', risk_if_skipped: 'Attacker retains admin access to all AWS resources.', details: 'Revoke active sessions for contractor-temp role', api_call: 'aws sts get-caller-identity --profile default\naws iam list-role-policies --role-name contractor-temp', automation: 'manual' },
    { order: 2, action: 'Detach AdministratorAccess', severity: 'CRITICAL', risk: 'CRITICAL', target: 'contractor-temp', reason: 'Eliminate full admin access — attacker currently has unrestricted AWS access.', risk_if_skipped: 'Attacker can continue to create resources and exfiltrate data.', details: 'Remove overly permissive policy', api_call: 'aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess', automation: 'manual' },
    { order: 3, action: 'Terminate suspicious EC2 instances', severity: 'HIGH', risk: 'HIGH', target: 'i-abc123, i-xyz789', reason: 'Stop crypto-mining activity and prevent further resource abuse.', risk_if_skipped: 'Ongoing crypto-mining costs and potential lateral movement.', details: 'Stop and terminate mining instances', api_call: 'aws ec2 terminate-instances --instance-ids i-abc123 i-xyz789', automation: 'automated' },
    { order: 4, action: 'Restore security group rules', severity: 'HIGH', risk: 'HIGH', target: 'sg-abc123, sg-def456', reason: 'Close SSH and C2 ports that allowed initial access and lateral movement.', risk_if_skipped: 'Exposed ports remain open for future exploitation.', details: 'Remove 0.0.0.0/0 SSH access', api_call: 'aws ec2 revoke-security-group-ingress --group-id sg-abc123 --protocol tcp --port 22 --cidr 0.0.0.0/0', automation: 'automated' },
    { order: 5, action: 'Enable MFA for IAM', severity: 'MEDIUM', risk: 'MEDIUM', target: 'All IAM users', reason: 'Prevent future compromise via stolen credentials.', risk_if_skipped: 'Credential theft remains a viable attack vector.', details: 'Require MFA for sensitive operations', api_call: 'aws iam enable-mfa-device --user-name <USER> --serial-number <MFA_ARN> --authentication-code1 <CODE1> --authentication-code2 <CODE2>', automation: 'manual' },
  ];
  const jiraContent = `[SEC] Security Incident ${incidentId}

**Summary:** Cryptocurrency mining attack via compromised IAM role

**Priority:** Critical
**Affected Resources:** IAM role contractor-temp, EC2 instances, Security Groups
**Root Cause:** ${rootCause}
**Attack Pattern:** ${attackPattern}

**Remediation Steps:**
1. Revoke IAM role session
2. Detach AdministratorAccess policy
3. Terminate suspicious EC2 instances
4. Restore security group rules
5. Enable MFA for IAM

**Assignee:** [Security Team]`;

  const slackContent = `🚨 *Security Incident* \`${incidentId}\`
*Root Cause:* ${rootCause.substring(0, 150)}...
*Remediation:* 5 steps | Est. 15 min
<https://nova-sentinel.app/incidents/${incidentId}|View in Nova Sentinel>`;

  const confluenceContent = `= Incident Postmortem: ${incidentId} =

h3. Timeline
${(timeline?.events || []).slice(0, 5).map((e: any, i: number) => `${i + 1}. ${e.timestamp} - ${e.action} (${e.severity})`).join('\n')}

h3. Impact Analysis
*Blast Radius:* ${timeline?.blast_radius?.substring(0, 200) || 'IAM, EC2, Security Groups'}...

h3. Lessons Learned
- Least privilege for contractor roles
- MFA enforcement for sensitive operations`;

  return {
    incident_id: incidentId,
    status: 'completed',
    analysis_time_ms: 1200,
    agents: {
      temporal: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
      visual: { status: 'SKIPPED', model: 'amazon.nova-pro-v1:0' },
      risk_scorer: { status: 'COMPLETED', model: 'amazon.nova-micro-v1:0' },
      remediation: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
      documentation: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
    },
    results: {
      timeline: demoAnalysisData.timeline,
      risk_scores: [
        { event: 'CreateRole', risk_score: 45 },
        { event: 'AttachRolePolicy', risk_score: 78 },
        { event: 'AuthorizeSecurityGroupIngress', risk_score: 85 },
        { event: 'RunInstances', risk_score: 92 },
        { event: 'GuardDutyFinding', risk_score: 98 },
      ],
      remediation_plan: { steps, estimated_time_minutes: 15, impact_assessment: { resources_affected: 5, iam_policies_to_modify: 2 } },
      documentation: {
        jira: { title: `SEC-${incidentId}`, content: jiraContent },
        slack: { title: 'Security Alert', content: slackContent },
        confluence: { title: `Incident ${incidentId}`, content: confluenceContent },
      },
    },
    model_used: 'instant-demo (client-side)',
    metadata: { scenario: scenarioId, quick_demo: true },
  };
}
