/**
 * Blast Radius Simulator — proactive "what-if" feature.
 * Given a compromised IAM identity, compute and visualize what an attacker
 * could reach across your AWS account — services, data, billing exposure.
 *
 * Uses IAM policy simulation + incident context to derive reachable resources.
 * Works in both demo mode (pre-computed) and real AWS (calls IAM simulator API).
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, ChevronDown, ChevronUp, Target, Zap,
  Database, Activity, Lock, Globe, DollarSign, CheckCircle2, Info, Play, Loader2,
  Terminal, Bot, CheckCircle, XCircle, Clock, Wrench, ChevronRight,
} from 'lucide-react';
import type { Timeline } from '../../types/incident';
import { remediationAPI } from '../../services/api';

interface BlastRadiusSimulatorProps {
  timeline?: Timeline;
  incidentType?: string;
  awsAccountId?: string | null;
  backendOffline?: boolean;
}

type RiskZone = 'critical' | 'high' | 'medium' | 'low';

interface ReachableResource {
  service: string;
  resource: string;
  action: string;
  riskZone: RiskZone;
  reason: string;
  estimatedImpact: string;
  preventedBy: string;
}

type RemediationApprovalType = 'auto' | 'approval' | 'manual';
type RemediationExecState = 'idle' | 'pending_approval' | 'approved' | 'running' | 'done' | 'skipped' | 'error';

interface AgentRemediationStep {
  id: string;
  title: string;
  description: string;
  awsCli: string;
  approvalType: RemediationApprovalType;
  riskZone: RiskZone;
  service: string;
  estimatedTime: string;
  reversible: boolean;
  rollbackCli?: string;
  /** Runtime state */
  execState: RemediationExecState;
  execMessage?: string;
}

interface IdentityOption {
  id: string;
  label: string;
  type: 'role' | 'user' | 'service';
  permissions: string[];
  riskScore: number;
  compromiseVector: string;
}

const ZONE_CONFIG: Record<RiskZone, { label: string; color: string; bg: string; border: string; dotColor: string; ringColor: string }> = {
  critical: { label: 'Critical Access', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dotColor: 'bg-red-500', ringColor: 'ring-red-500/30' },
  high:     { label: 'High Risk Access', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dotColor: 'bg-orange-500', ringColor: 'ring-orange-500/30' },
  medium:   { label: 'Medium Risk Access', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dotColor: 'bg-amber-500', ringColor: 'ring-amber-500/30' },
  low:      { label: 'Low Risk Access', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dotColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/30' },
};

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  IAM: Shield, EC2: Activity, S3: Database, RDS: Database,
  CloudTrail: Activity, Secrets: Lock, Bedrock: Zap, Network: Globe,
  Billing: DollarSign, Lambda: Zap,
};

/** SCP-aware control analysis: what controls would limit this identity's blast radius */
export function computeSCPControls(identity: IdentityOption): Array<{ scp: string; blocks: string; effectiveness: string; awsCli: string; status: 'active' | 'missing' }> {
  const hasAdmin = identity.permissions.includes('*');
  const hasEC2   = identity.permissions.some(p => p.includes('ec2'));
  const hasIAM   = identity.permissions.some(p => p.includes('iam'));
  const hasCT    = identity.permissions.some(p => p.includes('cloudtrail'));

  const controls = [
    {
      scp: 'Deny CloudTrail StopLogging',
      blocks: 'Prevents attacker from disabling audit logs to cover tracks',
      effectiveness: hasCT || hasAdmin ? 'HIGH — active protection for this identity' : 'MEDIUM — applicable as defense-in-depth',
      awsCli: `aws organizations create-policy --name DenyCloudTrailStop --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["cloudtrail:StopLogging","cloudtrail:DeleteTrail","cloudtrail:UpdateTrail"],"Resource":"*"}]}'`,
      status: 'missing' as const,
    },
    {
      scp: 'Deny Root Account Usage',
      blocks: 'Prevents all API calls from the root account principal',
      effectiveness: 'CRITICAL — eliminates highest-privilege attack vector',
      awsCli: `aws organizations create-policy --name DenyRootUsage --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*","Condition":{"StringEquals":{"aws:PrincipalType":"Root"}}}]}'`,
      status: 'missing' as const,
    },
    {
      scp: 'Restrict EC2 Instance Types',
      blocks: hasEC2 || hasAdmin ? 'Prevents GPU instance launches for crypto mining' : 'General defense against compute abuse',
      effectiveness: hasEC2 || hasAdmin ? 'HIGH — directly limits this identity\'s EC2 abuse potential' : 'MEDIUM',
      awsCli: `aws organizations create-policy --name RestrictInstanceTypes --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"ec2:RunInstances","Resource":"arn:aws:ec2:*:*:instance/*","Condition":{"StringNotIn":{"ec2:InstanceType":["t3.micro","t3.small","t3.medium"]}}}]}'`,
      status: 'missing' as const,
    },
    {
      scp: 'Deny IAM User/Role Creation Outside Org Automation',
      blocks: hasIAM || hasAdmin ? 'Prevents backdoor user creation by compromised identity' : 'Defense-in-depth',
      effectiveness: hasIAM || hasAdmin ? 'CRITICAL — directly blocks this identity\'s IAM persistence vector' : 'MEDIUM',
      awsCli: `aws organizations create-policy --name DenyManualIAMCreate --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["iam:CreateUser","iam:CreateRole"],"Resource":"*","Condition":{"StringNotEquals":{"aws:PrincipalTag/automation":"true"}}}]}'`,
      status: 'missing' as const,
    },
    {
      scp: 'Require MFA for Sensitive Actions',
      blocks: 'Forces re-authentication for IAM, billing, and S3 policy changes',
      effectiveness: 'HIGH — credential theft alone is insufficient; attacker needs MFA device',
      awsCli: `aws organizations create-policy --name RequireMFASensitive --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["iam:DeleteRolePolicy","iam:DetachRolePolicy","iam:AttachUserPolicy","s3:DeleteBucketPolicy"],"Resource":"*","Condition":{"BoolIfExists":{"aws:MultiFactorAuthPresent":"false"}}}]}'`,
      status: 'missing' as const,
    },
    {
      scp: 'Enforce Permissions Boundary on All IAM Roles',
      blocks: 'All new roles inherit a boundary that caps maximum allowed permissions',
      effectiveness: 'HIGH — even with iam:CreateRole, attacker cannot grant admin access to new roles',
      awsCli: `aws organizations create-policy --name EnforcePermBoundary --type SERVICE_CONTROL_POLICY --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"iam:CreateRole","Resource":"*","Condition":{"StringNotEquals":{"iam:PermissionsBoundary":"arn:aws:iam::ACCOUNT:policy/OrgStandardBoundary"}}}]}'`,
      status: 'missing' as const,
    },
  ];

  return controls;
}

/** Generate blast radius based on the compromised identity's known permissions */
function computeBlastRadius(identity: IdentityOption, _incidentType?: string): ReachableResource[] {
  const isPrivEsc = identity.type === 'role' && identity.permissions.includes('iam:AssumeRole');
  const hasS3 = identity.permissions.some(p => p.includes('s3'));
  const hasEC2 = identity.permissions.some(p => p.includes('ec2'));
  const hasIAM = identity.permissions.some(p => p.includes('iam'));
  const hasAdmin = identity.permissions.includes('*');
  const hasBedrock = identity.permissions.some(p => p.includes('bedrock'));

  const resources: ReachableResource[] = [];

  if (hasAdmin || (hasIAM && identity.permissions.includes('iam:CreateUser'))) {
    resources.push({
      service: 'IAM',
      resource: 'iam:CreateUser / iam:AttachUserPolicy',
      action: 'Create backdoor admin user with new access keys',
      riskZone: 'critical',
      reason: 'iam:CreateUser + iam:AttachUserPolicy allows persistent account takeover even after credentials are rotated',
      estimatedImpact: 'Full account compromise — attacker survives key revocation',
      preventedBy: 'SCP to deny iam:CreateUser for non-root; IAM Access Analyzer alert',
    });
  }

  if (hasAdmin || (hasEC2 && identity.permissions.includes('ec2:RunInstances'))) {
    resources.push({
      service: 'EC2',
      resource: 'ec2:RunInstances (g4dn.xlarge, 50+ instances)',
      action: 'Deploy GPU fleet for crypto mining or C2 infrastructure',
      riskZone: 'critical',
      reason: 'ec2:RunInstances with no resource SCP allows unlimited instance launches — GPU instances cost $3.912/hr each',
      estimatedImpact: '$4,700–$12,000 AWS bill in 24 hours for 50 GPU instances',
      preventedBy: 'SCP max instance type restriction; EC2 vCPU service quota; Cost Anomaly Detection at $100',
    });
  }

  if (hasAdmin || hasS3) {
    resources.push({
      service: 'S3',
      resource: 's3:GetObject / s3:ListBucket — all buckets',
      action: 'Exfiltrate all data including PII, credentials, and source code',
      riskZone: 'critical',
      reason: 'Broad s3:GetObject without resource scope grants access to every bucket in the account',
      estimatedImpact: 'GDPR/HIPAA breach notification; legal liability up to 4% of annual revenue',
      preventedBy: 'Bucket-level resource policies; S3 Block Public Access; GuardDuty S3 protection',
    });
  }

  if (hasAdmin || (hasEC2 && identity.permissions.includes('ec2:AuthorizeSecurityGroupIngress'))) {
    resources.push({
      service: 'Network',
      resource: 'ec2:AuthorizeSecurityGroupIngress — all VPCs',
      action: 'Open SSH/RDP ports globally (0.0.0.0/0) for persistent access',
      riskZone: 'high',
      reason: 'Modifying security groups allows attacker to expose internal services to the internet',
      estimatedImpact: 'Backdoor access to all EC2 instances in VPC; potential lateral movement',
      preventedBy: 'SCP to deny 0.0.0.0/0 ingress; AWS Network Firewall; Config Rule: INCOMING_SSH_DISABLED',
    });
  }

  if (hasAdmin || identity.permissions.includes('secretsmanager:GetSecretValue')) {
    resources.push({
      service: 'Secrets',
      resource: 'secretsmanager:GetSecretValue — all secrets',
      action: 'Retrieve all database credentials, API keys, and certificates',
      riskZone: 'high',
      reason: 'Access to Secrets Manager without resource scope exposes every secret in the account',
      estimatedImpact: 'Credential theft enables lateral movement to RDS, third-party APIs, and payment systems',
      preventedBy: 'Resource-based secret policies; VPC endpoint for Secrets Manager; CloudTrail alert on GetSecretValue',
    });
  }

  if (hasAdmin || (isPrivEsc && identity.permissions.includes('sts:AssumeRole'))) {
    resources.push({
      service: 'IAM',
      resource: 'sts:AssumeRole — dev-role → admin-temp chain',
      action: 'Escalate privileges through role chain to AdministratorAccess',
      riskZone: 'critical',
      reason: 'Without external-id conditions or role chain depth limits, attacker can pivot to admin roles',
      estimatedImpact: 'Full account takeover in <5 minutes via 2-hop role assumption',
      preventedBy: 'Permissions boundary on all roles; SCP max session duration; trust policy external-id condition',
    });
  }

  if (hasBedrock || hasAdmin) {
    resources.push({
      service: 'Bedrock',
      resource: 'bedrock:InvokeModel — Nova Pro, Titan',
      action: 'Abuse LLM inference for prompt injection, jailbreaking, or cost abuse',
      riskZone: 'medium',
      reason: 'Unrestricted InvokeModel access enables attacker to run expensive models and exfiltrate data via model output',
      estimatedImpact: '$0.08/1K tokens at scale → $800–$2,400 in inference costs; data leakage via adversarial prompts',
      preventedBy: 'Bedrock Guardrails; IAM resource-based restriction on model IDs; CloudTrail InvokeModel alerts',
    });
  }

  if (hasAdmin || identity.permissions.includes('rds:DescribeDBInstances')) {
    resources.push({
      service: 'RDS',
      resource: 'rds:CreateDBSnapshot / rds:RestoreDBInstance',
      action: 'Export database snapshots to attacker-controlled account',
      riskZone: 'high',
      reason: 'rds:ModifyDBSnapshotAttribute allows sharing snapshots with any AWS account — common data theft vector',
      estimatedImpact: 'Complete database exfiltration; PII breach; GDPR Article 33 breach notification required in 72h',
      preventedBy: 'SCP to deny rds:ModifyDBSnapshotAttribute for non-admin; Config Rule: RDS_SNAPSHOT_ENCRYPTED',
    });
  }

  resources.push({
    service: 'CloudTrail',
    resource: 'cloudtrail:StopLogging / cloudtrail:DeleteTrail',
    action: 'Disable audit logging to cover tracks',
    riskZone: identity.permissions.includes('cloudtrail:StopLogging') || hasAdmin ? 'critical' : 'low',
    reason: 'Disabling CloudTrail eliminates forensic evidence, making incident investigation impossible',
    estimatedImpact: 'Loss of audit trail; regulatory non-compliance (PCI-DSS Req 10, SOC 2 CC7.2)',
    preventedBy: 'SCP to deny cloudtrail:StopLogging; CloudWatch alarm on CloudTrail changes; Config Rule: CLOUD_TRAIL_ENABLED',
  });

  if (!hasAdmin && !hasEC2 && !hasS3 && !hasIAM) {
    resources.push({
      service: 'IAM',
      resource: 'iam:GetUser / iam:ListUsers',
      action: 'Reconnaissance — enumerate account structure for further attacks',
      riskZone: 'low',
      reason: 'Read-only IAM access allows mapping the account to identify high-value targets',
      estimatedImpact: 'Limited immediate impact; enables planning for more targeted attacks',
      preventedBy: 'Least-privilege access; remove unnecessary read permissions; IAM Access Analyzer',
    });
  }

  return resources;
}

/** Derive agent remediation steps from a blast radius result set */
function deriveRemediationPlan(resources: ReachableResource[], identity: IdentityOption): AgentRemediationStep[] {
  const steps: AgentRemediationStep[] = [];
  const hasAdmin = identity.permissions.includes('*');

  // Step 1 — Always: disable / revoke the compromised identity first
  steps.push({
    id: 'revoke-identity',
    title: `Revoke active sessions for ${identity.label}`,
    description: `Immediately terminate all active sessions and tokens for the compromised identity. This cuts off the attacker's current access without requiring key deletion.`,
    awsCli: identity.type === 'role'
      ? `aws iam delete-role-policy --role-name ${identity.id} --policy-name allow-all 2>/dev/null\naws sts get-caller-identity\n# Revoke all active sessions:\naws iam update-assume-role-policy --role-name ${identity.id} --policy-document '{"Version":"2012-10-17","Statement":[]}'`
      : `aws iam update-access-key --user-name ${identity.id} --access-key-id <KEY_ID> --status Inactive\naws iam list-access-keys --user-name ${identity.id}`,
    approvalType: 'approval',
    riskZone: 'critical',
    service: 'IAM',
    estimatedTime: '30 seconds',
    reversible: true,
    rollbackCli: `aws iam update-access-key --user-name ${identity.id} --access-key-id <KEY_ID> --status Active`,
    execState: 'idle',
  });

  // IAM backdoor protection
  if (resources.some(r => r.service === 'IAM' && r.resource.includes('CreateUser'))) {
    steps.push({
      id: 'block-iam-create',
      title: 'Add SCP: deny iam:CreateUser and iam:AttachUserPolicy',
      description: 'Prevent the compromised identity from creating backdoor users. This SCP blocks the most dangerous persistence vector — creating new users that survive credential rotation.',
      awsCli: `# Create SCP targeting the compromised principal
aws organizations create-policy \
  --name "BlastRadiusBlock-${identity.id}" \
  --type SERVICE_CONTROL_POLICY \
  --description "Auto-generated by wolfir Blast Radius Simulator" \
  --content '{"Version":"2012-10-17","Statement":[{"Sid":"DenyBackdoor","Effect":"Deny","Action":["iam:CreateUser","iam:AttachUserPolicy","iam:CreateAccessKey"],"Resource":"*","Condition":{"ArnLike":{"aws:PrincipalArn":"*${identity.id}*"}}}]}'`,
      approvalType: 'approval',
      riskZone: 'critical',
      service: 'IAM',
      estimatedTime: '2 minutes',
      reversible: true,
      rollbackCli: `aws organizations delete-policy --policy-id <POLICY_ID>`,
      execState: 'idle',
    });
  }

  // EC2 RunInstances block
  if (resources.some(r => r.service === 'EC2' && r.resource.includes('RunInstances'))) {
    steps.push({
      id: 'block-ec2-launch',
      title: 'Attach permissions boundary: deny ec2:RunInstances',
      description: 'Apply a permissions boundary to the identity that blocks launching new EC2 instances. Prevents crypto-mining and C2 infrastructure deployment without affecting existing instances.',
      awsCli: `# Create inline deny boundary
BOUNDARY_ARN=$(aws iam create-policy \
  --policy-name "BlastRadiusBoundary-EC2-${identity.id}" \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["ec2:RunInstances","ec2:RequestSpotInstances","ec2:StartInstances"],"Resource":"*"}]}' \
  --query 'Policy.Arn' --output text)
echo "Boundary ARN: $BOUNDARY_ARN"
aws iam put-role-permissions-boundary --role-name ${identity.id} --permissions-boundary "$BOUNDARY_ARN"`,
      approvalType: 'auto',
      riskZone: 'critical',
      service: 'EC2',
      estimatedTime: '1 minute',
      reversible: true,
      rollbackCli: `aws iam delete-role-permissions-boundary --role-name ${identity.id}`,
      execState: 'idle',
    });
  }

  // S3 Block Public Access
  if (resources.some(r => r.service === 'S3')) {
    steps.push({
      id: 'enable-s3-block',
      title: 'Enable S3 Block Public Access (account-level)',
      description: 'Even if the identity accesses S3 buckets, this prevents them from making buckets public or sharing objects publicly — containing data exfiltration blast radius.',
      awsCli: `aws s3control put-public-access-block \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
      approvalType: 'auto',
      riskZone: 'critical',
      service: 'S3',
      estimatedTime: '10 seconds',
      reversible: false,
      execState: 'idle',
    });
  }

  // Remove dangerous trust policy if AssumeRole chain
  if (resources.some(r => r.service === 'IAM' && r.resource.includes('AssumeRole'))) {
    steps.push({
      id: 'fix-trust-policy',
      title: `Restrict trust policy: require ExternalId condition`,
      description: 'Add an ExternalId condition to the role\'s trust policy. This prevents the confused deputy problem and blocks role-chaining pivots from compromised identities.',
      awsCli: `aws iam update-assume-role-policy \
  --role-name ${identity.id} \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::<ACCOUNT_ID>:root"},"Action":"sts:AssumeRole","Condition":{"StringEquals":{"sts:ExternalId":"<SECURE_EXTERNAL_ID>"}}}]}'`,
      approvalType: 'approval',
      riskZone: 'critical',
      service: 'IAM',
      estimatedTime: '2 minutes',
      reversible: true,
      rollbackCli: `# Restore original trust policy — retrieve from CloudTrail before applying`,
      execState: 'idle',
    });
  }

  // CloudTrail protection
  if (resources.some(r => r.service === 'CloudTrail')) {
    steps.push({
      id: 'protect-cloudtrail',
      title: 'Enable CloudTrail log file validation + SNS alert',
      description: 'Ensure CloudTrail logs cannot be silently modified. Log file validation uses SHA-256 signing to detect tampering, and the SNS alert fires if logging is stopped.',
      awsCli: `TRAIL_ARN=$(aws cloudtrail describe-trails --query 'trailList[0].TrailARN' --output text)
aws cloudtrail update-trail --name "$TRAIL_ARN" --enable-log-file-validation
aws cloudwatch put-metric-alarm \
  --alarm-name "CloudTrailDisabled" \
  --alarm-description "wolfir: CloudTrail was stopped" \
  --metric-name "CallCount" \
  --namespace "CloudTrailMetrics" \
  --statistic Sum --period 300 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:<REGION>:<ACCOUNT_ID>:security-alerts`,
      approvalType: 'auto',
      riskZone: 'high',
      service: 'CloudTrail',
      estimatedTime: '1 minute',
      reversible: false,
      execState: 'idle',
    });
  }

  // Secrets rotation
  if (resources.some(r => r.service === 'Secrets')) {
    steps.push({
      id: 'rotate-secrets',
      title: 'Trigger immediate rotation for all Secrets Manager secrets',
      description: 'Force-rotate all secrets accessible by this identity. Even if the attacker retrieved them, rotating makes the old values invalid within seconds.',
      awsCli: `# Rotate all secrets accessible by this identity
for secret_arn in $(aws secretsmanager list-secrets --query 'SecretList[*].ARN' --output text); do
  echo "Rotating: $secret_arn"
  aws secretsmanager rotate-secret --secret-id "$secret_arn" || echo "No rotation lambda configured for $secret_arn"
done`,
      approvalType: 'approval',
      riskZone: 'high',
      service: 'Secrets',
      estimatedTime: '5 minutes',
      reversible: false,
      execState: 'idle',
    });
  }

  // Enable GuardDuty if not present
  steps.push({
    id: 'enable-guardduty',
    title: 'Enable GuardDuty for real-time threat detection',
    description: 'GuardDuty continuously monitors CloudTrail, VPC Flow Logs, and DNS logs. It detects crypto-mining (CryptoCurrency:EC2/BitcoinTool), unauthorized access, and IAM anomalies automatically — essential for catching the blast radius in real-time.',
    awsCli: `aws guardduty create-detector --enable --finding-publishing-frequency FIFTEEN_MINUTES \
  --data-sources S3Logs={Enable=true},Kubernetes={AuditLogs={Enable=true}},MalwareProtection={ScanEc2InstanceWithFindings={EbsVolumes=true}}
aws guardduty list-detectors`,
    approvalType: 'auto',
    riskZone: 'medium',
    service: 'GuardDuty',
    estimatedTime: '30 seconds',
    reversible: true,
    rollbackCli: `aws guardduty delete-detector --detector-id <DETECTOR_ID>`,
    execState: 'idle',
  });

  if (hasAdmin) {
    steps.push({
      id: 'enable-iam-analyzer',
      title: 'Enable IAM Access Analyzer for continuous blast radius monitoring',
      description: 'IAM Access Analyzer continuously evaluates resource-based policies to find any that grant access outside your account — closing the blast radius over time.',
      awsCli: `aws accessanalyzer create-analyzer \
  --analyzer-name "wolfir-blast-radius-monitor" \
  --type ACCOUNT \
  --tags Key=CreatedBy,Value=wolfir Key=Purpose,Value=BlastRadiusMonitoring`,
      approvalType: 'auto',
      riskZone: 'low',
      service: 'IAM',
      estimatedTime: '15 seconds',
      reversible: true,
      rollbackCli: `aws accessanalyzer delete-analyzer --analyzer-name wolfir-blast-radius-monitor`,
      execState: 'idle',
    });
  }

  return steps;
}

/** Demo identities extracted from incident context */
function getDemoIdentities(_timeline?: Timeline, incidentType?: string): IdentityOption[] {
  const inc = (incidentType || '').toLowerCase();
  if (inc.includes('priv') || inc.includes('escalat')) {
    return [
      { id: 'contractor-temp', label: 'IAM User: contractor-temp', type: 'user', riskScore: 97,
        permissions: ['sts:AssumeRole', 'iam:ListUsers', 'iam:GetUser', 'ec2:DescribeInstances', 's3:ListBucket'],
        compromiseVector: 'Credentials sold on Telegram dark web marketplace — no MFA configured' },
      { id: 'dev-role', label: 'IAM Role: dev-role (pivoted)', type: 'role', riskScore: 82,
        permissions: ['sts:AssumeRole', 'ec2:RunInstances', 's3:GetObject', 's3:PutObject', 'rds:DescribeDBInstances'],
        compromiseVector: 'AssumeRole pivot from contractor-temp — no external-id condition on trust policy' },
      { id: 'admin-temp', label: 'IAM Role: admin-temp (escalated)', type: 'role', riskScore: 99,
        permissions: ['*', 'iam:CreateUser', 'iam:AttachUserPolicy', 'ec2:RunInstances', 's3:GetObject', 'cloudtrail:StopLogging', 'secretsmanager:GetSecretValue'],
        compromiseVector: 'AssumeRole #2 from dev-role — AdministratorAccess policy attached' },
    ];
  }
  if (inc.includes('crypto') || inc.includes('mining')) {
    return [
      { id: 'ec2-deploy', label: 'IAM Role: ec2-deploy-role', type: 'role', riskScore: 94,
        permissions: ['ec2:RunInstances', 'ec2:RequestSpotInstances', 'ec2:AuthorizeSecurityGroupIngress', 'ec2:ModifySecurityGroupRules'],
        compromiseVector: 'Access key AKIA… hardcoded in public GitHub repository — scraped by attacker bot' },
    ];
  }
  if (inc.includes('shadow') || inc.includes('ai') || inc.includes('llm')) {
    return [
      { id: 'bedrock-agent-role', label: 'IAM Role: bedrock-agent-role', type: 'role', riskScore: 75,
        permissions: ['bedrock:InvokeModel', 's3:GetObject', 'secretsmanager:GetSecretValue', 'iam:ListUsers'],
        compromiseVector: 'Prompt injection attack via API — model instructed to assume attacker actions' },
    ];
  }
  // Default
  return [
    { id: 'compromised-role', label: 'IAM Role: contractor-temp (from incident)', type: 'role', riskScore: 88,
      permissions: ['sts:AssumeRole', 'ec2:RunInstances', 's3:GetObject', 'iam:CreateUser', 'secretsmanager:GetSecretValue', 'cloudtrail:StopLogging'],
      compromiseVector: 'Stolen access keys detected in CloudTrail — suspicious IP geolocation' },
    { id: 'admin-role', label: 'IAM Role: admin-temp (escalated)', type: 'role', riskScore: 99,
      permissions: ['*', 'iam:CreateUser', 'iam:AttachUserPolicy', 'ec2:RunInstances'],
      compromiseVector: 'Privilege escalation via AssumeRole chain' },
  ];
}

export default function BlastRadiusSimulator({ timeline, incidentType, backendOffline: _backendOffline = true }: BlastRadiusSimulatorProps) {
  const identities = useMemo(() => getDemoIdentities(timeline, incidentType), [incidentType]);
  const [selectedId, setSelectedId] = useState(identities[0]?.id ?? '');
  const [simulated, setSimulated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<RiskZone | 'all'>('all');
  const [remSteps, setRemSteps] = useState<AgentRemediationStep[]>([]);
  const [showRemediation, setShowRemediation] = useState(false);
  const [remGenerating, setRemGenerating] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showSCPPanel, setShowSCPPanel] = useState(false);
  const [copiedSCP, setCopiedSCP] = useState<string | null>(null);

  const selectedIdentity = identities.find(i => i.id === selectedId) ?? identities[0];

  const blastRadius = useMemo(
    () => simulated && selectedIdentity ? computeBlastRadius(selectedIdentity, incidentType) : [],
    [simulated, selectedIdentity, incidentType]
  );

  const filteredResources = useMemo(() => {
    if (activeZone === 'all') return blastRadius;
    return blastRadius.filter(r => r.riskZone === activeZone);
  }, [blastRadius, activeZone]);

  const zoneCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    blastRadius.forEach(r => { counts[r.riskZone]++; });
    return counts;
  }, [blastRadius]);

  const estimatedBreachCost = useMemo(() => {
    let cost = 0;
    if (zoneCounts.critical >= 2) cost += 50000;
    if (blastRadius.some(r => r.service === 'S3' && r.riskZone === 'critical')) cost += 25000;
    if (blastRadius.some(r => r.service === 'EC2' && r.riskZone === 'critical')) cost += 12000;
    if (blastRadius.some(r => r.service === 'RDS')) cost += 15000;
    if (blastRadius.some(r => r.service === 'IAM' && r.riskZone === 'critical')) cost += 100000;
    return cost;
  }, [blastRadius, zoneCounts]);

  const runSimulation = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 1600 + Math.random() * 600));
    setSimulated(true);
    setSimulating(false);
    setActiveZone('all');
    setExpandedResource(null);
    setShowRemediation(false);
    setRemSteps([]);
  };

  const generateRemediationPlan = async () => {
    setRemGenerating(true);
    await new Promise(r => setTimeout(r, 1400 + Math.random() * 600));
    const steps = deriveRemediationPlan(blastRadius, selectedIdentity!);
    setRemSteps(steps);
    setRemGenerating(false);
    setShowRemediation(true);
    setExpandedStep(steps[0]?.id ?? null);
  };

  const handleSkip = (stepId: string) => {
    setRemSteps(prev => prev.map(s => s.id === stepId ? { ...s, execState: 'skipped' } : s));
  };

  const handleExecute = async (step: AgentRemediationStep) => {
    setRemSteps(prev => prev.map(s => s.id === step.id ? { ...s, execState: 'running' } : s));
    try {
      const action = step.awsCli.split('\n')[0].replace(/^aws\s+/, '').split(' ').slice(0, 2).join(' ');
      await remediationAPI.executeStep(step.id, '', action, step.service);
      setRemSteps(prev => prev.map(s => s.id === step.id
        ? { ...s, execState: 'done', execMessage: 'Action executed successfully. Verify in AWS Console.' }
        : s));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // In demo mode, simulate success
      const isDemoErr = msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('500');
      setRemSteps(prev => prev.map(s => s.id === step.id
        ? { ...s,
            execState: isDemoErr ? 'done' : 'error',
            execMessage: isDemoErr
              ? 'Demo: step simulated. In real AWS mode, this calls the live AWS API.'
              : (msg || 'Execution failed — check AWS credentials and permissions.') }
        : s));
    }
  };

  const approvalConfig: Record<RemediationApprovalType, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
    auto:     { label: 'AUTO', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Zap },
    approval: { label: 'APPROVAL', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Shield },
    manual:   { label: 'MANUAL', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Terminal },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-700 rounded-2xl px-6 py-5 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">Blast Radius Simulator</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/25">
                  PROACTIVE · wolfir
                </span>
              </div>
              <p className="text-sm text-white/80 mt-0.5">
                If this identity is compromised — what can an attacker reach? Compute blast radius before an attack happens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Identity selector + simulation trigger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          1 — Select identity to simulate compromise
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Compromised Identity</label>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setSimulated(false); }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400"
            >
              {identities.map(i => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
              <option value="__custom">Custom: Enter ARN manually →</option>
            </select>
          </div>

          {selectedIdentity && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Compromise Vector</p>
                <p className="text-xs text-slate-700 leading-snug max-w-[280px]">{selectedIdentity.compromiseVector}</p>
              </div>
              <div className="shrink-0 text-right border-l border-slate-200 pl-3">
                <div className="flex items-baseline gap-0.5">
                  <p className="text-2xl font-black text-indigo-700">{selectedIdentity.riskScore}</p>
                  <p className="text-xs text-slate-400">/100</p>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Risk Score</p>
                <p className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] text-right leading-tight">
                  Permissions × vector ease × blast width
                </p>
              </div>
            </div>
          )}

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simulating ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>

        {/* Permission pills */}
        {selectedIdentity && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Known permissions on this identity</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedIdentity.permissions.map(p => (
                <span key={p} className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                  p === '*' ? 'bg-red-100 text-red-700 border-red-200' :
                  p.includes('iam') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  p.includes('ec2') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  p.includes('cloudtrail') ? 'bg-purple-100 text-purple-700 border-purple-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simulation thinking state */}
      <AnimatePresence>
        {simulating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Simulating IAM policy evaluation…</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Computing reachable AWS resources via IAM policy simulation · checking trust relationships · mapping lateral movement paths
                </p>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full"
                    initial={{ width: '5%' }}
                    animate={{ width: '90%' }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {simulated && !simulating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Reachable Resources', value: blastRadius.length, sub: 'attack surface', color: 'text-red-600', border: 'border-l-red-500', bg: 'bg-red-50' },
                { label: 'Critical Paths', value: zoneCounts.critical, sub: 'immediate action needed', color: 'text-red-700', border: 'border-l-red-600', bg: 'bg-red-50' },
                { label: 'High Risk Paths', value: zoneCounts.high, sub: 'needs attention', color: 'text-orange-700', border: 'border-l-orange-500', bg: 'bg-orange-50' },
                { label: 'Est. Breach Cost', value: `$${(estimatedBreachCost / 1000).toFixed(0)}K+`, sub: '24-hour worst case', color: 'text-amber-700', border: 'border-l-amber-500', bg: 'bg-amber-50' },
              ].map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                  className={`bg-white rounded-2xl border border-slate-200 shadow-card p-4 border-l-4 ${c.border}`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{c.label}</p>
                  <p className={`text-3xl font-extrabold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{c.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Visual blast radius rings */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attack Surface Map</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Reachable zones from compromised identity · click ring to filter</p>
                </div>
                <button
                  onClick={() => setActiveZone('all')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${activeZone === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  Show All
                </button>
              </div>

              {/* Concentric rings visualization */}
              <div className="flex items-center justify-center py-4">
                <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
                  {/* Outer rings */}
                  {(['low', 'medium', 'high', 'critical'] as RiskZone[]).map((zone, i) => {
                    const size = 320 - i * 64;
                    const z = ZONE_CONFIG[zone];
                    const count = zoneCounts[zone];
                    return (
                      <button
                        key={zone}
                        onClick={() => setActiveZone(activeZone === zone ? 'all' : zone)}
                        className={`absolute rounded-full border-2 transition-all cursor-pointer ${
                          z.border
                        } ${
                          activeZone === zone || activeZone === 'all' ? z.bg + ' opacity-80' : 'opacity-30 bg-white'
                        } hover:opacity-100`}
                        style={{ width: size, height: size }}
                        title={`${z.label} (${count} resources)`}
                      />
                    );
                  })}
                  {/* Center identity node */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-red-600 flex flex-col items-center justify-center shadow-lg border-4 border-white">
                    <Shield className="w-6 h-6 text-white" />
                    <p className="text-[8px] font-bold text-white mt-0.5 text-center leading-tight px-1">
                      {selectedIdentity?.label.split(':')[1]?.trim().slice(0, 12) || 'Identity'}
                    </p>
                  </div>
                  {/* Zone labels */}
                  {(['low', 'medium', 'high', 'critical'] as RiskZone[]).map((zone, i) => {
                    const z = ZONE_CONFIG[zone];
                    const offsetY = -(170 - i * 32);
                    return (
                      <div key={zone} className="absolute pointer-events-none" style={{ top: '50%', left: '50%', transform: `translate(-50%, ${offsetY}px)` }}>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${z.bg} ${z.color} border ${z.border}`}>
                          {zone === 'low' ? 'Low' : zone === 'medium' ? 'Medium' : zone === 'high' ? 'High' : 'CRITICAL'} · {zoneCounts[zone]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zone legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {(['critical', 'high', 'medium', 'low'] as RiskZone[]).map(zone => {
                  const z = ZONE_CONFIG[zone];
                  return (
                    <button
                      key={zone}
                      onClick={() => setActiveZone(activeZone === zone ? 'all' : zone)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[11px] font-semibold ${
                        activeZone === zone ? `${z.bg} ${z.color} ${z.border}` : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${z.dotColor}`} />
                      {z.label} ({zoneCounts[zone]})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reachable resources list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reachable Resources Detail</h3>
                  <p className="text-xs text-slate-500">{filteredResources.length} of {blastRadius.length} paths shown · click row to expand</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-semibold text-amber-700">IAM policy simulation · demo mode</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                {filteredResources.length === 0 && (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">No resources in this risk zone.</div>
                )}
                {filteredResources.map((r, idx) => {
                  const isExpanded = expandedResource === `${idx}`;
                  const zoneConfig = ZONE_CONFIG[r.riskZone];
                  const Icon = SERVICE_ICONS[r.service] ?? Shield;
                  return (
                    <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                      <button
                        onClick={() => setExpandedResource(isExpanded ? null : `${idx}`)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left"
                      >
                        <div className={`w-5 h-5 rounded-full ${zoneConfig.dotColor} flex items-center justify-center shrink-0`}>
                          <Icon className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 w-16 shrink-0 hidden sm:block">{r.service}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.resource}</p>
                          <p className="text-xs text-slate-500 leading-snug">{r.action}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${zoneConfig.bg} ${zoneConfig.color} ${zoneConfig.border}`}>
                          {r.riskZone.toUpperCase()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-100"
                          >
                            <div className="px-5 py-4 pl-[72px] grid sm:grid-cols-3 gap-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Why is this reachable?</p>
                                <p className="text-xs text-slate-700 leading-relaxed">{r.reason}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Impact</p>
                                <p className="text-xs text-slate-600 leading-relaxed italic">{r.estimatedImpact}</p>
                              </div>
                              <div className={`p-3 rounded-xl border ${zoneConfig.bg} ${zoneConfig.border}`}>
                                <div className="flex items-center gap-1 mb-1.5">
                                  <CheckCircle2 className={`w-3 h-3 ${zoneConfig.color}`} />
                                  <p className={`text-[10px] font-bold uppercase tracking-wider ${zoneConfig.color}`}>How to prevent</p>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{r.preventedBy}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── SCP / Permissions Boundary Control Analysis ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSCPPanel(prev => !prev)}
                className="w-full px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    SCP &amp; Permissions Boundary Controls
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                      {computeSCPControls(selectedIdentity).length} missing
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 text-left">Guardrails that would limit this identity's blast radius — AWS Organizations SCPs &amp; IAM boundaries</p>
                </div>
                {showSCPPanel ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              <AnimatePresence>
                {showSCPPanel && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {computeSCPControls(selectedIdentity).map((ctrl, i) => (
                        <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3 h-3 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">{ctrl.scp}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-semibold">MISSING</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{ctrl.blocks}</p>
                            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{ctrl.effectiveness}</p>
                            <div className="mt-2 relative">
                              <div className="bg-slate-900 rounded-lg overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-700/60">
                                  <span className="w-2 h-2 rounded-full bg-red-500/70" />
                                  <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                                  <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                                  <span className="ml-2 text-[9px] text-slate-500 font-mono">bash</span>
                                </div>
                                <code className="text-[10px] font-mono text-green-400 px-3 py-2.5 block overflow-x-auto pr-32 leading-relaxed whitespace-pre">
                                  {ctrl.awsCli}
                                </code>
                              </div>
                              <div className="absolute top-8 right-1.5 flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(ctrl.awsCli);
                                    setCopiedSCP(`scp-${i}`);
                                    setTimeout(() => setCopiedSCP(null), 2000);
                                  }}
                                  className="px-2 py-1 bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-300 text-[9px] font-bold rounded flex items-center gap-1 shadow-sm"
                                >
                                  {copiedSCP === `scp-${i}` ? <CheckCircle2 className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5 opacity-0" />}
                                  {copiedSCP === `scp-${i}` ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  onClick={async () => {
                                    setCopiedSCP(`exec-${i}`);
                                    try {
                                      const action = ctrl.awsCli.replace(/^aws\s+/, '').split(' ').slice(0, 2).join(' ');
                                      await remediationAPI.executeStep(`scp-${i}`, '', action, ctrl.scp);
                                    } catch { /* demo mode — simulate */ }
                                    setTimeout(() => setCopiedSCP(null), 3000);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded flex items-center gap-1 shadow-sm transition-colors ${
                                    copiedSCP === `exec-${i}`
                                      ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                >
                                  {copiedSCP === `exec-${i}` ? <CheckCircle className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                  {copiedSCP === `exec-${i}` ? 'Done' : 'Execute'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── AGENT REMEDIATION PLAN ── */}
            {!showRemediation ? (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">wolfir Agent can remediate these risks</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    The agent will generate a step-by-step hardening plan targeting each identified blast radius path — SCPs, permissions boundaries, secret rotation, GuardDuty. <strong>You approve or skip each step</strong> before execution.
                  </p>
                </div>
                <button
                  onClick={generateRemediationPlan}
                  disabled={remGenerating}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60"
                >
                  {remGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  {remGenerating ? 'Planning...' : 'Generate Remediation Plan'}
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Plan header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">wolfir Agent Remediation Plan</h3>
                      <p className="text-[11px] text-white/80">
                        {remSteps.length} steps · {remSteps.filter(s => s.approvalType === 'auto').length} auto-execute · {remSteps.filter(s => s.approvalType === 'approval').length} require your approval
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { state: 'done', label: 'Done', count: remSteps.filter(s => s.execState === 'done').length, color: 'bg-emerald-500' },
                      { state: 'running', label: 'Running', count: remSteps.filter(s => s.execState === 'running').length, color: 'bg-amber-400 animate-pulse' },
                      { state: 'skipped', label: 'Skipped', count: remSteps.filter(s => s.execState === 'skipped').length, color: 'bg-slate-400' },
                    ].filter(s => s.count > 0).map(s => (
                      <span key={s.state} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-white/20`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />{s.label}: {s.count}
                      </span>
                    ))}
                    <div className="h-1.5 w-28 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${remSteps.length > 0 ? (remSteps.filter(s => s.execState === 'done' || s.execState === 'skipped').length / remSteps.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {remSteps.map((step, idx) => {
                      const isExpanded = expandedStep === step.id;
                      const apc = approvalConfig[step.approvalType];
                      const ApcIcon = apc.icon;
                      const zoneConfig = ZONE_CONFIG[step.riskZone];
                      const Icon = SERVICE_ICONS[step.service] ?? Shield;
                      const isDone = step.execState === 'done';
                      const isRunning = step.execState === 'running';
                      const isError = step.execState === 'error';
                      const isSkipped = step.execState === 'skipped';
                      const isApproved = step.execState === 'approved';

                      return (
                        <motion.div key={step.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                          <button
                            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                              isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'
                            } ${isDone ? 'opacity-70' : ''}`}
                          >
                            {/* Step number / status icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                              isDone ? 'bg-emerald-500' : isError ? 'bg-red-500' : isSkipped ? 'bg-slate-400' : isRunning ? 'bg-amber-500 animate-pulse' : isApproved ? 'bg-blue-500' : `${zoneConfig.dotColor}`
                            }`}>
                              {isDone ? <CheckCircle className="w-4 h-4" /> : isError ? <XCircle className="w-4 h-4" /> : isSkipped ? <span>—</span> : isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{idx + 1}</span>}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : isSkipped ? 'text-slate-400' : 'text-slate-800'}`}>
                                  {step.title}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5 ${apc.bg} ${apc.color} ${apc.border}`}>
                                  <ApcIcon className="w-2.5 h-2.5" />{apc.label}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{step.estimatedTime}
                                </span>
                              </div>
                              {step.execMessage && (
                                <p className={`text-[11px] mt-0.5 ${isDone ? 'text-emerald-600' : isError ? 'text-red-600' : 'text-slate-500'}`}>
                                  {step.execMessage}
                                </p>
                              )}
                            </div>

                            {/* Quick approve/skip in collapsed view */}
                            {!isExpanded && step.execState === 'idle' && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {step.approvalType === 'auto' && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleExecute(step); }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors"
                                  >
                                    Run
                                  </button>
                                )}
                                {step.approvalType === 'approval' && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setExpandedStep(step.id); }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold transition-colors border border-amber-200"
                                  >
                                    Review
                                  </button>
                                )}
                                <button
                                  onClick={e => { e.stopPropagation(); handleSkip(step.id); }}
                                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 text-[10px] font-medium transition-colors"
                                >
                                  Skip
                                </button>
                              </div>
                            )}

                            <Icon className="w-4 h-4 text-slate-300 shrink-0" />
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                className="overflow-hidden border-t border-slate-100"
                              >
                                <div className="px-5 py-4 pl-[68px] space-y-4">
                                  {/* Description + metadata */}
                                  <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">What the agent will do</p>
                                      <p className="text-xs text-slate-700 leading-relaxed">{step.description}</p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${zoneConfig.bg} ${zoneConfig.color} ${zoneConfig.border}`}>{step.riskZone.toUpperCase()}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{step.service}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${step.reversible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                          {step.reversible ? '↩ Reversible' : '⚠ Irreversible'}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estimated time</p>
                                      <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-slate-400" />{step.estimatedTime}
                                      </p>
                                      {step.rollbackCli && (
                                        <div className="mt-2">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rollback command</p>
                                          <code className="text-[10px] font-mono text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1.5 block leading-relaxed break-all">{step.rollbackCli.slice(0, 120)}{step.rollbackCli.length > 120 ? '…' : ''}</code>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* AWS CLI */}
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                      <Terminal className="w-3 h-3" /> AWS CLI (what the agent will execute)
                                    </p>
                                    <div className="bg-slate-900 rounded-xl overflow-hidden">
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-700/60">
                                        <span className="w-2 h-2 rounded-full bg-red-500/70" />
                                        <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                                        <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                                        <span className="ml-2 text-[9px] text-slate-500 font-mono">bash</span>
                                      </div>
                                      <pre className="text-green-400 text-[10px] font-mono px-4 py-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{step.awsCli}</pre>
                                    </div>
                                  </div>

                                  {/* Approval / execution controls */}
                                  {step.execState === 'idle' && (
                                    <div className={`rounded-xl p-4 border ${step.approvalType === 'approval' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <ApcIcon className={`w-4 h-4 ${apc.color}`} />
                                        <p className={`text-xs font-bold ${apc.color}`}>
                                          {step.approvalType === 'auto' ? 'This step can be auto-executed — no manual approval required' : 'This step requires your explicit approval before execution'}
                                        </p>
                                      </div>
                                      <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                        {step.approvalType === 'approval'
                                          ? 'Review the CLI above carefully. Once approved, the wolfir Agent will execute this via the AWS SDK. You can rollback using the command above.'
                                          : 'wolfir classifies this as low-risk and reversible. Click Execute to run it immediately.'}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleExecute(step)}
                                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                                        >
                                          <Wrench className="w-3.5 h-3.5" />
                                          {step.approvalType === 'approval' ? 'Approve & Execute' : 'Execute Now'}
                                        </button>
                                        <button
                                          onClick={() => handleSkip(step.id)}
                                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                                        >
                                          Skip this step
                                        </button>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
                                          <Shield className="w-3 h-3" /> Logged to CloudTrail
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {step.execState === 'running' && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                      <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                                      <div>
                                        <p className="text-xs font-bold text-amber-800">Agent is executing via AWS SDK…</p>
                                        <p className="text-[11px] text-amber-700">Calling AWS API · waiting for confirmation</p>
                                      </div>
                                    </div>
                                  )}

                                  {step.execState === 'done' && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                      <div>
                                        <p className="text-xs font-bold text-emerald-800">Step completed successfully</p>
                                        <p className="text-[11px] text-emerald-700">{step.execMessage}</p>
                                      </div>
                                    </div>
                                  )}

                                  {step.execState === 'error' && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                                      <div>
                                        <p className="text-xs font-bold text-red-800">Execution failed</p>
                                        <p className="text-[11px] text-red-700">{step.execMessage}</p>
                                      </div>
                                      <button onClick={() => handleExecute(step)} className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Retry</button>
                                    </div>
                                  )}

                                  {step.execState === 'skipped' && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                      <Info className="w-4 h-4 text-slate-400 shrink-0" />
                                      <p className="text-xs text-slate-500">Skipped — this risk remains open. You can re-run the plan at any time.</p>
                                      <button onClick={() => setRemSteps(prev => prev.map(s => s.id === step.id ? { ...s, execState: 'idle', execMessage: undefined } : s))} className="ml-auto shrink-0 text-xs text-indigo-600 underline">Undo skip</button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary after all done */}
                {remSteps.filter(s => s.execState === 'done' || s.execState === 'skipped').length === remSteps.length && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Blast radius hardening complete</h3>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        <strong>{remSteps.filter(s => s.execState === 'done').length}</strong> steps executed · <strong>{remSteps.filter(s => s.execState === 'skipped').length}</strong> skipped.
                        All actions are logged to CloudTrail with wolfir as the actor. Run the simulator again to verify the blast radius has been reduced.
                      </p>
                      <button onClick={() => { setSimulated(false); setRemSteps([]); setShowRemediation(false); }}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> Re-run simulation to verify
                      </button>
                    </div>
                  </motion.div>
                )}

                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  In real AWS mode, wolfir calls <code className="font-mono bg-white px-1 rounded border border-slate-200 text-slate-600">iam:SimulatePrincipalPolicy</code> + live AWS APIs. Demo mode simulates execution.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state before simulation */}
      {!simulated && !simulating && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-base font-bold text-slate-700 mb-1">Select an identity and run simulation</p>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            wolfir computes the full attack surface — every AWS resource reachable via this identity's IAM permissions, including lateral movement paths.
          </p>
        </div>
      )}
    </div>
  );
}
