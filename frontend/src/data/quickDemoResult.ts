/**
 * Client-side instant demo — no API call, no backend dependency.
 * Used when "Use full AI analysis" is OFF for truly instant demo (~0ms).
 * Each scenario has distinct timeline, remediation, and risk data.
 */
import type { OrchestrationResponse } from '../types/incident';
import type { Timeline } from '../types/incident';

// --- CRYPTO-MINING ---
const CRYPTO_TIMELINE: Timeline = {
  events: [
    { timestamp: "2026-01-15T14:23:00Z", actor: "admin@company.com", action: "CreateRole", resource: "IAM Role: contractor-temp", severity: "MEDIUM", details: "Created a temporary role with AdministratorAccess policy", significance: "Foundation for privilege escalation." },
    { timestamp: "2026-01-18T09:45:00Z", actor: "admin@company.com", action: "AttachRolePolicy", resource: "IAM Role: contractor-temp", severity: "HIGH", details: "Attached AdministratorAccess managed policy", significance: "Enabled full account takeover." },
    { timestamp: "2026-01-19T04:00:00Z", actor: "contractor-session", action: "AuthorizeSecurityGroupIngress", resource: "Security Group: sg-abc123", severity: "HIGH", details: "Modified security group to allow SSH from 0.0.0.0/0", significance: "Opened initial access vector." },
    { timestamp: "2026-01-19T04:38:00Z", actor: "attacker-session", action: "DescribeInstances", resource: "EC2 Instances", severity: "MEDIUM", details: "Enumerated all EC2 instances", significance: "Reconnaissance at 4:38 AM — enumeration of 12 instances. Common precursor to exploitation." },
    { timestamp: "2026-01-19T04:53:00Z", actor: "attacker-session", action: "RunInstances", resource: "EC2 Instance: i-0abc123 (g4dn.xlarge)", severity: "HIGH", details: "Launched 3 GPU instances for crypto mining", significance: "EC2 instance i-0abc123 launched at 4:53 AM — 99th percentile for this account (first GPU launch in 30 days)." },
    { timestamp: "2026-02-04T08:23:00Z", actor: "guardduty.amazonaws.com", action: "GuardDutyFinding", resource: "EC2 Instance: i-abc123", severity: "CRITICAL", details: "Detected cryptocurrency mining activity", significance: "Confirmed malicious activity." },
  ],
  root_cause: "IAM role with excessive privileges (AdministratorAccess) was created for a contractor and later assumed by an attacker.",
  attack_pattern: "Privilege escalation via IAM role assumption, reconnaissance, lateral movement, and crypto mining deployment.",
  blast_radius: "Compromised IAM role, EC2 instances, modified security groups. Impact includes resource abuse and crypto mining.",
  confidence: 0.95,
  analysis_summary: "Compromised IAM role used to launch crypto mining instances over ~20 days.",
};

// --- DATA EXFILTRATION ---
const DATA_EXFIL_TIMELINE: Timeline = {
  events: [
    { timestamp: "2026-02-01T10:00:00Z", actor: "data-analyst", action: "GetObject", resource: "S3: company-sensitive-data/customer-pii/database-export.csv", severity: "HIGH", details: "Downloaded customer PII database export from sensitive bucket", significance: "Data accessed at 10:00 AM from external IP 195.2.3.4 — first access from this source in 90 days. 2.4 GB downloaded." },
    { timestamp: "2026-02-01T10:05:00Z", actor: "data-analyst", action: "GetObject", resource: "S3: company-sensitive-data/financial-records/q4-2024.csv", severity: "HIGH", details: "Downloaded financial records", significance: "Additional sensitive data theft." },
    { timestamp: "2026-02-01T10:10:00Z", actor: "data-analyst", action: "ListBucket", resource: "S3 Bucket: company-sensitive-data", severity: "MEDIUM", details: "Listed bucket contents to discover more files", significance: "Reconnaissance to locate additional data to exfiltrate." },
  ],
  root_cause: "IAM user data-analyst had excessive S3 read permissions on the company-sensitive-data bucket; credentials may have been compromised or misused.",
  attack_pattern: "Unauthorized access to sensitive S3 data via GetObject and ListBucket from external IP. Multiple large downloads suggest data exfiltration.",
  blast_radius: "S3 bucket company-sensitive-data, customer PII, financial records. Potential GDPR/privacy breach.",
  confidence: 0.92,
  analysis_summary: "Data exfiltration via S3 access. Sensitive PII and financial data downloaded from external IP.",
};

// --- PRIVILEGE ESCALATION ---
const PRIV_ESCAL_TIMELINE: Timeline = {
  events: [
    { timestamp: "2026-02-10T14:00:00Z", actor: "junior-dev", action: "ConsoleLogin", resource: "AWS Console", severity: "LOW", details: "IAM user with limited permissions logged in", significance: "Initial access as low-privilege user." },
    { timestamp: "2026-02-10T14:15:00Z", actor: "junior-dev", action: "AssumeRole", resource: "IAM Role: AdminRole", severity: "CRITICAL", details: "Assumed AdminRole to gain elevated privileges", significance: "Privilege escalation via role assumption." },
    { timestamp: "2026-02-10T14:30:00Z", actor: "admin-session", action: "CreateUser", resource: "IAM User: backdoor-admin", severity: "HIGH", details: "Created new IAM user while assuming admin role", significance: "Persistence mechanism." },
    { timestamp: "2026-02-10T14:32:00Z", actor: "admin-session", action: "AttachUserPolicy", resource: "IAM User: backdoor-admin", severity: "CRITICAL", details: "Attached AdministratorAccess to backdoor-admin user", significance: "Established permanent admin backdoor." },
  ],
  root_cause: "junior-dev had permission to assume AdminRole; after escalation, created backdoor-admin user with AdministratorAccess for persistence.",
  attack_pattern: "Insider threat — limited user assumed overly permissive AdminRole, then created backdoor IAM user with full admin access.",
  blast_radius: "AdminRole trust policy, IAM user backdoor-admin. Full account compromise possible.",
  confidence: 0.96,
  analysis_summary: "Privilege escalation from junior-dev to AdminRole, then creation of backdoor-admin with AdministratorAccess.",
};

// --- SHADOW AI / LLM ABUSE ---
const SHADOW_AI_TIMELINE: Timeline = {
  events: [
    { timestamp: "2026-03-01T09:00:00Z", actor: "lambda-shadow-ai (UnapprovedLambdaRole)", action: "InvokeModel", resource: "Bedrock: amazon.nova-pro-v1:0", severity: "HIGH", details: "Ungoverned InvokeModel from non-approved Lambda role", significance: "Shadow AI — model access outside approved policy." },
    { timestamp: "2026-03-01T09:15:00Z", actor: "lambda-shadow-ai", action: "InvokeModel", resource: "Bedrock: amazon.nova-pro-v1:0", severity: "HIGH", details: "Repeated InvokeModel calls — potential API abuse", significance: "High-volume usage from unexpected principal." },
    { timestamp: "2026-03-01T11:00:00Z", actor: "dev-experiment", action: "InvokeModelWithResponseStream", resource: "Bedrock: amazon.nova-2-lite-v1:0", severity: "HIGH", details: "Streaming invocation from external IP 198.51.100.77", significance: "Potential prompt injection vector — OWASP LLM01." },
    { timestamp: "2026-03-01T12:30:00Z", actor: "lambda-shadow-ai", action: "InvokeModel", resource: "Bedrock: amazon.nova-pro-v1:0", severity: "HIGH", details: "Continued shadow AI usage", significance: "Persistent ungoverned access." },
    { timestamp: "2026-03-02T17:00:00Z", actor: "ai-security.amazonaws.com", action: "GuardDutyFinding", resource: "Bedrock: Shadow AI", severity: "CRITICAL", details: "Ungoverned Bedrock InvokeModel from non-approved principal — 47 invocations in 24h", significance: "MITRE ATLAS AML.T0016 (Capability theft), OWASP LLM01." },
  ],
  root_cause: "Lambda role UnapprovedLambdaRole and IAM user dev-experiment invoked Bedrock models without approval. Shadow AI — ungoverned LLM usage outside policy.",
  attack_pattern: "Shadow AI / LLM Abuse. Ungoverned InvokeModel from non-approved principals. MITRE ATLAS AML.T0051 (Prompt injection), AML.T0016 (Capability theft). OWASP LLM Top 10.",
  blast_radius: "Bedrock Nova Pro, Nova 2 Lite. Risk of prompt injection, data exfiltration via model output, cost abuse.",
  confidence: 0.93,
  analysis_summary: "Shadow AI detected: ungoverned Bedrock InvokeModel from Lambda and dev user. MITRE ATLAS and OWASP LLM Top 10 alignment.",
};

// --- UNAUTHORIZED ACCESS ---
const UNAUTH_ACCESS_TIMELINE: Timeline = {
  events: [
    { timestamp: "2026-02-05T08:00:00Z", actor: "external-user", action: "AssumeRole", resource: "IAM Role (attempt)", severity: "MEDIUM", details: "AccessDenied — failed to assume role from external IP 198.51.100.100", significance: "Initial failed access attempt." },
    { timestamp: "2026-02-05T08:05:00Z", actor: "external-user", action: "GetObject", resource: "S3: company-secrets/api-keys/production.env", severity: "CRITICAL", details: "Downloaded production API keys from secrets bucket", significance: "Compromised credentials used to access sensitive data." },
    { timestamp: "2026-02-05T08:10:00Z", actor: "external-user", action: "ListBucket", resource: "S3 Bucket: company-secrets", severity: "HIGH", details: "Listed secrets bucket to discover more sensitive files", significance: "Reconnaissance of sensitive data." },
  ],
  root_cause: "External actor (IP 198.51.100.100) accessed sensitive resources using compromised credentials for external-user. S3 bucket company-secrets was accessible.",
  attack_pattern: "External unauthorized access. Stolen/leaked credentials used to bypass IAM and access production secrets.",
  blast_radius: "S3 bucket company-secrets, production API keys. Risk of account takeover or downstream compromise.",
  confidence: 0.94,
  analysis_summary: "External actor with compromised credentials accessed production secrets from company-secrets bucket.",
};

// --- SCENARIO DATA MAP ---
const SCENARIO_DATA: Record<string, {
  timeline: Timeline;
  risk_scores: Array<{ event: string; risk_score: number }>;
  remediation_steps: Array<{ order: number; action: string; severity: string; risk: string; target: string; reason: string; risk_if_skipped: string; details: string; api_call: string; automation: string }>;
  incident_type: string;
  affected_resources: string;
}> = {
  "crypto-mining": {
    timeline: CRYPTO_TIMELINE,
    risk_scores: [
      { event: "CreateRole", risk_score: 45 },
      { event: "AttachRolePolicy", risk_score: 78 },
      { event: "AuthorizeSecurityGroupIngress", risk_score: 85 },
      { event: "RunInstances", risk_score: 92 },
      { event: "GuardDutyFinding", risk_score: 98 },
    ],
    remediation_steps: [
      { order: 1, action: "Revoke IAM role session", severity: "CRITICAL", risk: "CRITICAL", target: "contractor-temp", reason: "Remove active compromised sessions.", risk_if_skipped: "Attacker retains admin access.", details: "Revoke sessions for contractor-temp role", api_call: "aws iam list-role-policies --role-name contractor-temp", automation: "manual" },
      { order: 2, action: "Detach AdministratorAccess", severity: "CRITICAL", risk: "CRITICAL", target: "contractor-temp", reason: "Eliminate full admin access.", risk_if_skipped: "Attacker can continue exploitation.", details: "Remove overly permissive policy", api_call: "aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess", automation: "manual" },
      { order: 3, action: "Terminate suspicious EC2 instances", severity: "HIGH", risk: "HIGH", target: "i-abc123, i-xyz789", reason: "Stop crypto-mining activity.", risk_if_skipped: "Ongoing costs and lateral movement.", details: "Stop and terminate mining instances", api_call: "aws ec2 terminate-instances --instance-ids i-abc123 i-xyz789", automation: "automated" },
      { order: 4, action: "Restore security group rules", severity: "HIGH", risk: "HIGH", target: "sg-abc123, sg-def456", reason: "Close SSH and C2 ports.", risk_if_skipped: "Exposed ports remain open.", details: "Remove 0.0.0.0/0 SSH access", api_call: "aws ec2 revoke-security-group-ingress --group-id sg-abc123 --protocol tcp --port 22 --cidr 0.0.0.0/0", automation: "automated" },
      { order: 5, action: "Enable MFA for IAM", severity: "MEDIUM", risk: "MEDIUM", target: "All IAM users", reason: "Prevent future credential theft.", risk_if_skipped: "Credential theft remains viable.", details: "Require MFA", api_call: "aws iam enable-mfa-device --user-name <USER> --serial-number <MFA_ARN>", automation: "manual" },
    ],
    incident_type: "Cryptocurrency Mining Attack",
    affected_resources: "IAM role contractor-temp, EC2 instances, Security Groups",
  },
  "data-exfiltration": {
    timeline: DATA_EXFIL_TIMELINE,
    risk_scores: [
      { event: "GetObject", risk_score: 88 },
      { event: "GetObject", risk_score: 92 },
      { event: "ListBucket", risk_score: 65 },
    ],
    remediation_steps: [
      { order: 1, action: "Disable data-analyst access keys", severity: "CRITICAL", risk: "CRITICAL", target: "data-analyst", reason: "Immediately revoke compromised credentials.", risk_if_skipped: "Ongoing data exfiltration.", details: "Delete access keys for data-analyst", api_call: "aws iam list-access-keys --user-name data-analyst\naws iam delete-access-key --user-name data-analyst --access-key-id <KEY_ID>", automation: "manual" },
      { order: 2, action: "Enable S3 bucket blocking", severity: "HIGH", risk: "HIGH", target: "company-sensitive-data", reason: "Block public and unusual access.", risk_if_skipped: "Further data theft possible.", details: "Apply bucket policy and Block Public Access", api_call: "aws s3api put-public-access-block --bucket company-sensitive-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true", automation: "automated" },
      { order: 3, action: "Audit and rotate S3 access", severity: "HIGH", risk: "HIGH", target: "company-sensitive-data", reason: "Review who has read access.", risk_if_skipped: "Over-permissioned users remain.", details: "Apply least privilege", api_call: "aws s3api get-bucket-policy --bucket company-sensitive-data", automation: "manual" },
      { order: 4, action: "Enable CloudTrail data events for S3", severity: "MEDIUM", risk: "MEDIUM", target: "S3", reason: "Improve detection of future access.", risk_if_skipped: "Delayed detection.", details: "Enable S3 data event logging", api_call: "aws cloudtrail put-event-selectors", automation: "automated" },
    ],
    incident_type: "Data Exfiltration",
    affected_resources: "S3 bucket company-sensitive-data, customer PII, financial records",
  },
  "privilege-escalation": {
    timeline: PRIV_ESCAL_TIMELINE,
    risk_scores: [
      { event: "ConsoleLogin", risk_score: 25 },
      { event: "AssumeRole", risk_score: 95 },
      { event: "CreateUser", risk_score: 88 },
      { event: "AttachUserPolicy", risk_score: 98 },
    ],
    remediation_steps: [
      { order: 1, action: "Delete backdoor-admin user", severity: "CRITICAL", risk: "CRITICAL", target: "backdoor-admin", reason: "Remove persistence mechanism.", risk_if_skipped: "Attacker retains full admin.", details: "Delete IAM user and access keys", api_call: "aws iam delete-user --user-name backdoor-admin", automation: "manual" },
      { order: 2, action: "Restrict AdminRole assumption", severity: "CRITICAL", risk: "CRITICAL", target: "AdminRole", reason: "Prevent junior-dev from assuming admin.", risk_if_skipped: "Escalation can repeat.", details: "Update trust policy to exclude junior-dev", api_call: "aws iam get-role --role-name AdminRole\naws iam update-assume-role-policy", automation: "manual" },
      { order: 3, action: "Revoke junior-dev sessions", severity: "HIGH", risk: "HIGH", target: "junior-dev", reason: "End active admin session.", risk_if_skipped: "Active session may still exist.", details: "Revoke all sessions", api_call: "aws iam list-access-keys --user-name junior-dev", automation: "manual" },
      { order: 4, action: "Enable MFA + Conditional Access", severity: "MEDIUM", risk: "MEDIUM", target: "All IAM users", reason: "Require MFA for sensitive roles.", risk_if_skipped: "Future escalation easier.", details: "Enforce MFA for role assumption", api_call: "aws iam enable-mfa-device", automation: "manual" },
    ],
    incident_type: "Privilege Escalation",
    affected_resources: "AdminRole, IAM users junior-dev, backdoor-admin",
  },
  "unauthorized-access": {
    timeline: UNAUTH_ACCESS_TIMELINE,
    risk_scores: [
      { event: "AssumeRole (failed)", risk_score: 45 },
      { event: "GetObject", risk_score: 96 },
      { event: "ListBucket", risk_score: 72 },
    ],
    remediation_steps: [
      { order: 1, action: "Revoke external-user credentials", severity: "CRITICAL", risk: "CRITICAL", target: "external-user", reason: "Credentials are compromised.", risk_if_skipped: "Continued unauthorized access.", details: "Delete access keys and disable user", api_call: "aws iam list-access-keys --user-name external-user\naws iam delete-access-key", automation: "manual" },
      { order: 2, action: "Rotate production API keys", severity: "CRITICAL", risk: "CRITICAL", target: "production.env", reason: "Keys were exfiltrated.", risk_if_skipped: "Downstream account takeover.", details: "Rotate all keys in production.env", api_call: "Manual key rotation in affected systems", automation: "manual" },
      { order: 3, action: "Restrict company-secrets bucket", severity: "HIGH", risk: "HIGH", target: "company-secrets", reason: "Limit who can access secrets.", risk_if_skipped: "Future exfiltration.", details: "Apply least-privilege bucket policy", api_call: "aws s3api get-bucket-policy --bucket company-secrets", automation: "manual" },
      { order: 4, action: "Block IP 198.51.100.100", severity: "MEDIUM", risk: "MEDIUM", target: "WAF / Security Groups", reason: "Known malicious source IP.", risk_if_skipped: "IP may retry.", details: "Add to blocklist", api_call: "Add to WAF block rule or SG deny", automation: "automated" },
    ],
    incident_type: "Unauthorized Access",
    affected_resources: "S3 bucket company-secrets, production API keys",
  },
  "shadow-ai": {
    timeline: SHADOW_AI_TIMELINE,
    risk_scores: [
      { event: "InvokeModel (shadow)", risk_score: 82 },
      { event: "InvokeModel (shadow)", risk_score: 85 },
      { event: "InvokeModelWithResponseStream", risk_score: 78 },
      { event: "InvokeModel (shadow)", risk_score: 88 },
      { event: "GuardDutyFinding", risk_score: 96 },
    ],
    remediation_steps: [
      { order: 1, action: "Revoke UnapprovedLambdaRole Bedrock access", severity: "CRITICAL", risk: "CRITICAL", target: "UnapprovedLambdaRole", reason: "Stop shadow AI usage.", risk_if_skipped: "Continued ungoverned model access.", details: "Remove bedrock:InvokeModel from role policy", api_call: "aws iam detach-role-policy --role-name UnapprovedLambdaRole", automation: "manual" },
      { order: 2, action: "Audit dev-experiment IAM user", severity: "CRITICAL", risk: "CRITICAL", target: "dev-experiment", reason: "External IP invocation may indicate prompt injection.", risk_if_skipped: "Prompt injection risk.", details: "Review and restrict Bedrock permissions", api_call: "aws iam list-attached-user-policies --user-name dev-experiment", automation: "manual" },
      { order: 3, action: "Enable Bedrock Guardrails", severity: "HIGH", risk: "HIGH", target: "Bedrock", reason: "Block prompt injection and PII leakage.", risk_if_skipped: "OWASP LLM01 remains.", details: "Configure content filters and prompt attack blocking", api_call: "aws bedrock create-guardrail", automation: "manual" },
      { order: 4, action: "Add CloudTrail data events for Bedrock", severity: "MEDIUM", risk: "MEDIUM", target: "CloudTrail", reason: "Full audit trail for compliance.", risk_if_skipped: "Limited visibility.", details: "Enable Bedrock data event logging", api_call: "aws cloudtrail put-event-selectors", automation: "automated" },
    ],
    incident_type: "Shadow AI / LLM Abuse",
    affected_resources: "Bedrock Nova Pro, Nova 2 Lite; UnapprovedLambdaRole, dev-experiment",
  },
};

function makeId(): string {
  return "INC-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getQuickDemoResult(scenarioId: string): OrchestrationResponse {
  const scenario = SCENARIO_DATA[scenarioId] ?? SCENARIO_DATA["crypto-mining"];
  const incidentId = makeId();
  const { timeline, risk_scores, remediation_steps, incident_type, affected_resources } = scenario;

  const jiraContent = `[SEC] Security Incident ${incidentId}

**Summary:** ${incident_type}

**Priority:** Critical
**Affected Resources:** ${affected_resources}
**Root Cause:** ${timeline.root_cause}
**Attack Pattern:** ${timeline.attack_pattern}

**Remediation Steps:**
${remediation_steps.map((s) => `${s.order}. ${s.action}`).join("\n")}

**Assignee:** [Security Team]`;

  const slackContent = `*Security Incident Report — ${incidentId}*

*Classification:* Critical
*Channel:* #security-incidents

*Executive Summary*
${(timeline.root_cause || "").substring(0, 280)}${(timeline.root_cause || "").length > 280 ? "…" : ""}

*Incident Type:* ${incident_type}

*Attack Pattern*
${(timeline.attack_pattern || "").substring(0, 180)}${(timeline.attack_pattern || "").length > 180 ? "…" : ""}

*Blast Radius*
${(timeline.blast_radius || "See timeline").substring(0, 150)}${(timeline.blast_radius || "").length > 150 ? "…" : ""}

*Remediation*
${remediation_steps.length} steps identified. Full details in wolfir.

*Link*
<https://wolfir.app/incidents/${incidentId}|View in wolfir>`;

  const confluenceContent = `h1. Incident Postmortem: ${incidentId}

h2. Executive Summary
Security incident ${incidentId} was identified and analyzed. Root cause: ${(timeline.root_cause || "").substring(0, 120)}${(timeline.root_cause || "").length > 120 ? "…" : ""}

h2. Timeline
${(timeline.events || []).slice(0, 8).map((e: any) => `* ${e.timestamp || "N/A"} — ${e.action || "Event"} (Severity: ${e.severity || "N/A"})`).join("\n") || "No events recorded"}

h2. Impact Analysis
*Blast Radius:* ${timeline.blast_radius || "See timeline"}
*Attack Pattern:* ${timeline.attack_pattern || "See timeline"}

h2. Remediation Steps
${remediation_steps.map((s) => `* ${s.order}. ${s.action}`).join("\n")}

h2. Lessons Learned
* Review least privilege for contractor and external roles
* Enforce MFA for sensitive operations
* Monitor security group and IAM policy changes
* Document incident timeline for audit trail`;

  return {
    incident_id: incidentId,
    status: "completed",
    analysis_time_ms: 1200,
    agents: {
      temporal: { status: "COMPLETED", model: "amazon.nova-2-lite-v1:0" },
      visual: { status: "SKIPPED", model: "amazon.nova-pro-v1:0" },
      risk_scorer: { status: "COMPLETED", model: "amazon.nova-micro-v1:0" },
      remediation: { status: "COMPLETED", model: "amazon.nova-2-lite-v1:0" },
      documentation: { status: "COMPLETED", model: "amazon.nova-2-lite-v1:0" },
    },
    results: {
      timeline,
      risk_scores,
      remediation_plan: {
        steps: remediation_steps,
        estimated_time_minutes: 15,
        impact_assessment: { resources_affected: remediation_steps.length, iam_policies_to_modify: scenarioId.includes("iam") || scenarioId.includes("privilege") ? 2 : 1 },
      },
      documentation: {
        jira: { title: `SEC-${incidentId}`, content: jiraContent },
        slack: { title: "Security Incident Report", content: slackContent },
        confluence: { title: `Incident ${incidentId}`, content: confluenceContent },
      },
    },
    model_used: "instant-demo (client-side)",
    metadata: { scenario: scenarioId, quick_demo: true },
  };
}
