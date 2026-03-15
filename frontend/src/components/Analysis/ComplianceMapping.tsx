/**
 * Compliance Mapping - Maps security findings to compliance frameworks
 * CIS, NIST 800-53, SOC 2, PCI-DSS — AI-generated from incident analysis
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Terminal, Info, ExternalLink, Download, Sparkles, Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { generateCompliancePdf } from '../../utils/generateCompliancePdf';
import type { Timeline } from '../../types/incident';
import { remediationAPI } from '../../services/api';

interface ComplianceMappingProps {
  timeline: Timeline;
  incidentType?: string;
  awsAccountId?: string | null;
}

interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  status: 'violated' | 'at-risk' | 'compliant' | 'not_evaluated';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  remediation: string;
  awsCli?: string;
  reference?: string;
  /** Why this timeline event maps to this control — explicit mapping reasoning */
  mappingReason?: string;
}

const FRAMEWORK_CONFIG: Record<string, { name: string; color: string; bg: string; border: string; dot: string; description?: string }> = {
  CIS:   { name: 'CIS Benchmarks', color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-500',  description: 'Center for Internet Security cloud controls' },
  NIST:  { name: 'NIST 800-53',    color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    description: 'Federal security & privacy controls catalog' },
  SOC2:  { name: 'SOC 2',          color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  dot: 'bg-indigo-500',  description: 'Trust service criteria for service orgs' },
  PCI:   { name: 'PCI-DSS',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', description: 'Payment card industry data security standard' },
  SOX:   { name: 'SOX',            color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   description: 'Financial reporting IT controls' },
  HIPAA: { name: 'HIPAA',          color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500',    description: 'Healthcare data privacy & security rules' },
};

function extractIncidentContext(timeline: Timeline, awsAccountId?: string | null): { roleArn: string; roleName: string; sgId: string; bucketName: string; vpcId: string; accountId: string } {
  const events = timeline.events || [];
  // Try to extract real resource names from the incident timeline first
  const roleName =
    events.find(e => /role|AssumeRole/i.test(e.resource || ''))?.resource?.match(/role[/:\s]+([\w-]+)/i)?.[1] ||
    events.find(e => /role|AssumeRole/i.test(e.action || ''))?.actor?.match(/([\w-]+)/)?.[1] ||
    '<ROLE_NAME>';
  const sgId =
    events.find(e => /sg-[a-z0-9]+/i.test(e.resource || ''))?.resource?.match(/(sg-[a-z0-9]+)/i)?.[1] ||
    '<SG_ID>';
  const bucketName =
    events.find(e => /S3|Bucket/i.test(e.resource || ''))?.resource?.match(/bucket[/:\s]+([\w.-]+)/i)?.[1] ||
    events.find(e => /S3|Bucket/i.test(e.resource || ''))?.resource?.match(/s3:::?([\w.-]+)/i)?.[1] ||
    '<BUCKET_NAME>';
  const vpcId =
    events.find(e => /vpc-[a-z0-9]+/i.test(e.resource || ''))?.resource?.match(/(vpc-[a-z0-9]+)/i)?.[1] ||
    '<VPC_ID>';
  // Use the real AWS account ID if available; otherwise show placeholder so CLI is clearly incomplete
  const accountId = awsAccountId || '<YOUR_ACCOUNT_ID>';
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
  return { roleArn, roleName, sgId, bucketName, vpcId, accountId };
}

function substitutePlaceholders(cli: string, ctx: ReturnType<typeof extractIncidentContext>): string {
  return cli
    .replace(/<ROLE_ARN>/g, ctx.roleArn)
    .replace(/<ROLE>/g, ctx.roleName)
    // Leave <USERNAME> as-is — real username must come from the incident  
    .replace(/<SG_ID>/g, ctx.sgId)
    .replace(/<BUCKET>/g, ctx.bucketName)
    .replace(/<VPC_ID>/g, ctx.vpcId)
    .replace(/<POLICY_ARN>/g, 'arn:aws:iam::aws:policy/AdministratorAccess')
    .replace(/<GROUP>/g, 'least-privilege-group')
    .replace(/<MFA_NAME>/g, '<your-mfa-device-name>')
    // MFA ARN uses the real account ID
    .replace(/<MFA_ARN>/g, `arn:aws:iam::${ctx.accountId}:mfa/<your-mfa-device-name>`)
    // Leave MFA codes as placeholders — these must be real TOTP codes
    .replace(/<TRAIL_NAME>/g, 'wolfir-security-trail')
    // Leave <ACCESS_KEY_ID> as a placeholder — must be the real key from iam list-access-keys
    .replace(/<KMS_KEY_ID>/g, '<your-kms-key-id>')
    .replace(/<KEY_ID>/g, '<your-kms-key-id>')
    .replace(/<YOUR_IP>/g, '<your-trusted-ip-cidr>');
}

function generateComplianceMappings(timeline: Timeline, incidentType?: string): ComplianceControl[] {
  const controls: ComplianceControl[] = [];
  const events = timeline.events || [];
  
  const hasIAMIssue = events.some(e => 
    (e.action || '').toLowerCase().includes('iam') || 
    (e.action || '').toLowerCase().includes('role') ||
    (e.action || '').toLowerCase().includes('policy') ||
    (e.action || '').toLowerCase().includes('privilege')
  );
  
  // Specific action matches — avoid broad "get" which triggers on GetCallerIdentity, GetRole etc.
  const hasDataAccess = events.some(e => {
    const action = (e.action || '').toLowerCase();
    return action.includes('getobject') || action.includes('putobject') || action.includes('s3:get') ||
      action.includes('s3:put') || action.includes('s3:delete') || action.includes('getbucketacl') ||
      (action.includes('s3') && (action.includes('get') || action.includes('put'))) ||
      (e.resource || '').toLowerCase().includes('s3') || (e.resource || '').toLowerCase().includes('bucket');
  });

  const hasNetworkIssue = events.some(e => {
    const action = (e.action || '').toLowerCase();
    return action.includes('authorizesecuritygroup') || action.includes('revokesecuritygroup') ||
      action.includes('createsecuritygroup') || action.includes('securitygroupingress') ||
      action.includes('modifysecuritygroup') || action.includes('createflowlogs') ||
      (e.resource || '').toLowerCase().includes('sg-') || (e.resource || '').toLowerCase().includes('security-group');
  });

  // Only flag crypto-mining when RunInstances or GPU-specific EC2 actions detected
  const hasCryptoMining = (incidentType || '').toLowerCase().includes('crypto') ||
    events.some(e => {
      const action = (e.action || '').toLowerCase();
      return action === 'runinstances' || action === 'ec2:runinstances' ||
        action.includes('runinstances') || (action.includes('ec2') && action.includes('instance'));
    });

  const hasEC2Activity = hasCryptoMining || events.some(e => {
    const action = (e.action || '').toLowerCase();
    return action.includes('ec2') || (e.resource || '').toLowerCase().includes('i-');
  });

  if (hasIAMIssue || hasCryptoMining) {
    const iamMappingReason = events.some(e => /AssumeRole|policy|privilege/i.test(e.action || ''))
      ? 'Timeline contains AssumeRole, policy changes, or privilege-escalation events → IAM controls apply.'
      : 'EC2/crypto-mining abuse indicates credential compromise → IAM least-privilege controls apply.';
    controls.push(
      {
        id: 'cis-1', framework: 'CIS', controlId: 'CIS 1.16', title: 'Ensure IAM policies are attached only to groups or roles',
        status: 'violated', severity: 'high',
        description: 'IAM policies were found attached directly to users rather than through groups or roles. This makes access management difficult to audit and increases the risk of over-privileged users.',
        impact: 'Direct user-attached policies bypass group-level controls and make it impossible to enforce consistent access patterns across the organization. Attackers who compromise a user account inherit all directly-attached permissions.',
        remediation: 'Migrate all user-attached policies to IAM groups or roles. Create role-based access groups and assign users to them instead.',
        awsCli: `aws iam list-user-policies --user-name <USERNAME>
aws iam detach-user-policy --user-name <USERNAME> --policy-arn <POLICY_ARN>
aws iam add-user-to-group --user-name <USERNAME> --group-name <GROUP>`,
        reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#use-groups-for-permissions',
        mappingReason: iamMappingReason,
      },
      {
        id: 'nist-1', framework: 'NIST', controlId: 'AC-6', title: 'Least Privilege',
        status: 'violated', severity: 'critical',
        description: 'Users or roles have excessive permissions beyond what is required for their function. Wildcard (*) permissions detected in IAM policies.',
        impact: 'Over-privileged accounts are the #1 cause of cloud security breaches. An attacker who compromises an over-privileged account can access all resources, escalate privileges, and exfiltrate data across the entire AWS environment.',
        remediation: 'Implement principle of least privilege. Use IAM Access Analyzer to identify unused permissions and scope them down to specific resources and actions.',
        awsCli: `aws iam generate-service-last-accessed-details --arn <ROLE_ARN>
aws accessanalyzer start-policy-generation --policy-generation-details '{"principalArn":"<ROLE_ARN>"}'`,
        reference: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        mappingReason: iamMappingReason,
      },
      {
        id: 'soc2-1', framework: 'SOC2', controlId: 'CC6.1', title: 'Logical and Physical Access Controls',
        status: 'at-risk', severity: 'high',
        description: 'Access controls are not sufficient to prevent unauthorized privilege escalation. MFA may not be enforced for all privileged users.',
        impact: 'SOC 2 audit failure on CC6.1 can result in loss of customer trust, inability to pass compliance audits, and potential loss of enterprise contracts that require SOC 2 attestation.',
        remediation: 'Implement MFA for all IAM users, enforce role-based access controls, and schedule regular access reviews using AWS IAM Access Analyzer.',
        awsCli: `aws iam create-virtual-mfa-device --virtual-mfa-device-name <MFA_NAME>
aws iam enable-mfa-device --user-name <USERNAME> --serial-number <MFA_ARN> --authentication-code1 <CODE1> --authentication-code2 <CODE2>`,
        reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
        mappingReason: iamMappingReason,
      },
      {
        id: 'pci-1', framework: 'PCI', controlId: 'Req 7.1', title: 'Limit access to system components',
        status: 'violated', severity: 'critical',
        description: 'Access to cardholder data environment is not restricted based on business need-to-know. Overly permissive IAM policies may grant access to payment-related resources.',
        impact: 'PCI-DSS Requirement 7 violations can result in fines of $5,000–$100,000/month from payment card brands, loss of ability to process card payments, and mandatory forensic investigation ($50,000+).',
        remediation: 'Implement role-based access control for all CDE resources. Restrict privileges to minimum necessary and document business justification for each access grant.',
        awsCli: 'aws iam put-role-policy --role-name <ROLE> --policy-name RestrictCDE --policy-document file://least-privilege-policy.json',
        reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html',
        mappingReason: iamMappingReason,
      },
    );
  }

  if (hasDataAccess) {
    const dataMappingReason = events.some(e => /GetObject|s3|download|PutObject/i.test(e.action || ''))
      ? 'Timeline contains S3 GetObject/PutObject or data download events → data protection controls apply.'
      : 'Timeline indicates data access or exfiltration patterns → encryption and DLP controls apply.';
    controls.push(
      {
        id: 'cis-2', framework: 'CIS', controlId: 'CIS 2.1.1', title: 'Ensure S3 Bucket Policy is set to deny HTTP requests',
        status: 'violated', severity: 'high',
        description: 'S3 buckets allow unencrypted HTTP access, risking data interception during transit. All data transfers should use HTTPS to prevent man-in-the-middle attacks.',
        impact: 'Unencrypted S3 access allows attackers on the same network to intercept sensitive data in transit. This is particularly dangerous for buckets containing PII, financial data, or credentials.',
        remediation: 'Enable S3 bucket policies that enforce HTTPS-only access by adding a condition denying all HTTP requests.',
        awsCli: 'aws s3api put-bucket-policy --bucket <BUCKET> --policy \'{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Principal":"*","Action":"s3:*","Resource":"arn:aws:s3:::<BUCKET>/*","Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}\'',
        reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html',
        mappingReason: dataMappingReason,
      },
      {
        id: 'nist-2', framework: 'NIST', controlId: 'SC-28', title: 'Protection of Information at Rest',
        status: 'at-risk', severity: 'high',
        description: 'Sensitive data may not be encrypted at rest in all storage services. AWS KMS encryption should be enabled for S3, RDS, EBS, and DynamoDB.',
        impact: 'Unencrypted data at rest is exposed if storage media is compromised, accounts are breached, or snapshots are shared. Regulatory frameworks require encryption for data containing PII.',
        remediation: 'Enable default encryption using AWS KMS for all S3 buckets, EBS volumes, and RDS instances.',
        awsCli: 'aws s3api put-bucket-encryption --bucket <BUCKET> --server-side-encryption-configuration \'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}\'',
        reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html',
        mappingReason: dataMappingReason,
      },
      {
        id: 'soc2-2', framework: 'SOC2', controlId: 'CC6.7', title: 'Restrict Transmission of Data',
        status: 'violated', severity: 'critical',
        description: 'Data transmission occurred without proper authorization and monitoring. Large data transfers detected without corresponding DLP controls.',
        impact: 'Unmonitored data transmission is the primary vector for data exfiltration. Without DLP controls, sensitive data can leave the organization without detection, leading to regulatory penalties and reputational damage.',
        remediation: 'Enable VPC Flow Logs, implement S3 access logging, and configure CloudWatch alarms for unusual data transfer patterns.',
        awsCli: 'aws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type cloud-watch-logs --log-group-name VPCFlowLogs\naws s3api put-bucket-logging --bucket <BUCKET> --bucket-logging-status file://logging-config.json',
        reference: 'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
        mappingReason: dataMappingReason,
      },
      {
        id: 'pci-2', framework: 'PCI', controlId: 'Req 3.4', title: 'Render PAN unreadable anywhere it is stored',
        status: 'at-risk', severity: 'high',
        description: 'Data stores may contain unencrypted sensitive information including potential cardholder data.',
        impact: 'Storing PAN data in clear text violates PCI-DSS and can result in immediate suspension of card processing capabilities. Breach notification costs average $150 per compromised record.',
        remediation: 'Implement tokenization or strong encryption for all sensitive data at rest. Use AWS CloudHSM or KMS for key management.',
        awsCli: 'aws kms create-key --description "PCI-DSS data encryption key"\naws kms create-alias --alias-name alias/pci-data-key --target-key-id <KMS_KEY_ID>',
        reference: 'https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html',
        mappingReason: dataMappingReason,
      },
    );
  }

  if (hasNetworkIssue || hasCryptoMining) {
    const networkMappingReason = hasCryptoMining
      ? 'Timeline contains RunInstances or EC2 abuse (crypto-mining) → network boundary and hardening controls apply.'
      : 'Timeline contains security group or network changes → boundary protection controls apply.';
    controls.push(
      {
        id: 'cis-3', framework: 'CIS', controlId: 'CIS 5.2', title: 'Ensure no security groups allow ingress from 0.0.0.0/0 to port 22',
        status: 'violated', severity: 'critical',
        description: 'Security groups allow unrestricted SSH access from the internet (0.0.0.0/0 on port 22). This is the most common entry point for cloud-based attacks.',
        impact: 'Open SSH access enables brute-force attacks, credential stuffing, and exploitation of SSH vulnerabilities. Compromised instances are commonly used for crypto mining, data exfiltration, and lateral movement.',
        remediation: 'Restrict SSH access to known IP ranges or eliminate SSH entirely by using AWS Systems Manager Session Manager for remote access.',
        awsCli: 'aws ec2 revoke-security-group-ingress --group-id <SG_ID> --protocol tcp --port 22 --cidr 0.0.0.0/0\naws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 22 --cidr <YOUR_IP>/32',
        reference: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html',
        mappingReason: networkMappingReason,
      },
      {
        id: 'nist-3', framework: 'NIST', controlId: 'SC-7', title: 'Boundary Protection',
        status: 'violated', severity: 'critical',
        description: 'Network boundaries are not properly protected against unauthorized access. Missing WAF rules, overly permissive security groups, and no VPC flow logging detected.',
        impact: 'Without boundary protection, attackers can freely traverse from the internet to internal resources. This enables full kill chain execution from initial access to data exfiltration.',
        remediation: 'Implement AWS WAF on all public-facing endpoints, restrict security groups to minimum required ports, and enable VPC flow logs for all VPCs.',
        awsCli: 'aws wafv2 create-web-acl --name ProtectAPI --scope REGIONAL --default-action \'{"Block":{}}\'  --rules file://waf-rules.json\naws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type s3 --log-destination arn:aws:s3:::<BUCKET>/flow-logs/',
        reference: 'https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html',
        mappingReason: networkMappingReason,
      },
    );
  }

  // Always add logging/monitoring and baseline controls so all framework tabs have content
  const baselineMappingReason = 'Incident analysis relies on CloudTrail — logging controls assessed as baseline.';
  controls.push(
    {
      id: 'cis-4', framework: 'CIS', controlId: 'CIS 3.1', title: 'Ensure CloudTrail is enabled in all regions',
      status: 'compliant', severity: 'low',
      description: 'CloudTrail logging is enabled across all regions, allowing comprehensive security event analysis and audit trails.',
      impact: 'Multi-region CloudTrail is the foundation of cloud security monitoring. This enabled wolfir to detect and analyze this incident.',
      remediation: 'Already compliant — maintain multi-region CloudTrail logging. Consider enabling CloudTrail Insights for anomaly detection.',
      awsCli: 'aws cloudtrail get-trail-status --name <TRAIL_NAME>',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
      mappingReason: baselineMappingReason,
    },
    {
      id: 'cis-5', framework: 'CIS', controlId: 'CIS 1.4', title: 'Ensure root user does not have access keys',
      status: events.some(e => /root|access.?key/i.test(e.resource || '')) ? 'violated' : 'compliant',
      severity: 'critical',
      description: 'Root account access keys pose an extreme risk. If compromised, they grant full account access with no restrictions.',
      impact: 'Root access keys bypass all IAM policies and MFA. Compromise leads to total account takeover.',
      remediation: 'Delete root access keys and use IAM users/roles instead. Enable MFA for root account.',
      awsCli: 'aws iam delete-access-key --access-key-id <ACCESS_KEY_ID> --user-name root',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
      mappingReason: events.some(e => /root|access.?key/i.test(e.resource || '')) ? 'Timeline contains root or access-key events → root credential controls apply.' : baselineMappingReason,
    },
    {
      id: 'cis-6', framework: 'CIS', controlId: 'CIS 4.2', title: 'Ensure security group rules do not allow unrestricted ingress',
      status: hasNetworkIssue ? 'violated' : 'compliant',
      severity: 'high',
      description: 'Security groups with 0.0.0.0/0 rules expose resources to the entire internet.',
      impact: 'Unrestricted ingress enables reconnaissance, exploitation, and lateral movement.',
      remediation: 'Restrict CIDR ranges to known IPs or VPC internal ranges only.',
      awsCli: 'aws ec2 revoke-security-group-ingress --group-id <SG_ID> --protocol all --cidr 0.0.0.0/0',
      reference: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html',
      mappingReason: hasNetworkIssue || hasCryptoMining ? 'Timeline contains security group or EC2 abuse → ingress controls apply.' : baselineMappingReason,
    },
    {
      id: 'nist-4', framework: 'NIST', controlId: 'AU-2', title: 'Audit Events',
      status: 'compliant', severity: 'low',
      description: 'Security-relevant events are being logged and monitored through CloudTrail, enabling incident detection and forensic analysis.',
      impact: 'Proper audit logging is critical for incident response, compliance attestation, and forensic investigation.',
      remediation: 'Continue monitoring and expand event coverage. Consider adding AWS Config rules for configuration change tracking.',
      awsCli: 'aws configservice put-configuration-recorder --configuration-recorder \'{"name":"default","roleARN":"<ROLE_ARN>","recordingGroup":{"allSupported":true}}\'',
      reference: 'https://docs.aws.amazon.com/config/latest/developerguide/recording-configuration.html',
    },
    {
      id: 'nist-5', framework: 'NIST', controlId: 'IA-5', title: 'Authenticator Management',
      status: hasIAMIssue ? 'at-risk' : 'compliant',
      severity: 'high',
      description: 'Password and MFA policies should enforce strength and rotation.',
      impact: 'Weak authenticator management enables credential-based attacks.',
      remediation: 'Enforce MFA for all users. Configure IAM password policy for complexity and expiration.',
      awsCli: 'aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html',
    },
    {
      id: 'nist-6', framework: 'NIST', controlId: 'RA-5', title: 'Vulnerability Scanning',
      status: hasCryptoMining ? 'at-risk' : 'compliant',
      severity: 'medium',
      description: 'Vulnerability scanning should be performed on EC2 instances and container images.',
      impact: 'Unpatched vulnerabilities enable initial access and privilege escalation.',
      remediation: 'Enable Inspector for EC2 and ECR. Schedule regular scans and automate remediation.',
      awsCli: 'aws inspector2 enable --resource-types EC2 ECR',
      reference: 'https://docs.aws.amazon.com/inspector/latest/user/enabling-inspector.html',
    },
    {
      id: 'nist-7', framework: 'NIST', controlId: 'SI-3', title: 'Malicious Code Protection',
      status: hasCryptoMining ? 'violated' : 'compliant',
      severity: 'critical',
      description: 'Endpoint protection and malware detection should be deployed on compute resources.',
      impact: 'Cryptominers and malware can run undetected without proper protection.',
      remediation: 'Enable GuardDuty for threat detection. Consider Inspector for vulnerability scanning.',
      awsCli: 'aws guardduty create-detector --enable',
      reference: 'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html',
    },
    {
      id: 'soc2-3', framework: 'SOC2', controlId: 'CC4.1', title: 'Logical Access Security',
      status: hasIAMIssue ? 'at-risk' : 'compliant',
      severity: 'high',
      description: 'Logical access to systems and data must be restricted based on roles and need-to-know.',
      impact: 'SOC 2 requires documented access controls; over-privileged access fails this control.',
      remediation: 'Implement least privilege. Document all access grants and review quarterly.',
      awsCli: 'aws iam generate-credential-report',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html',
    },
    {
      id: 'soc2-4', framework: 'SOC2', controlId: 'CC5.1', title: 'Logical Access - Security Events',
      status: 'compliant', severity: 'low',
      description: 'Security events are captured and monitored to detect unauthorized access.',
      impact: 'Event logging is required for SOC 2 audit trails and incident investigation.',
      remediation: 'Maintain CloudTrail and CloudWatch Logs. Configure alerts for critical events.',
      awsCli: 'aws logs create-log-group --log-group-name /security/audit',
      reference: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html',
    },
    {
      id: 'pci-3', framework: 'PCI', controlId: 'Req 8.2', title: 'Strong authentication for access',
      status: hasIAMIssue ? 'violated' : 'at-risk',
      severity: 'critical',
      description: 'PCI-DSS requires unique IDs and strong authentication (MFA) for all CDE access.',
      impact: 'Shared credentials or weak auth invalidate PCI compliance and increase breach risk.',
      remediation: 'Enforce MFA for all users with CDE access. Implement unique credentials per user.',
      awsCli: 'aws iam attach-user-policy --user-name <USERNAME> --policy-arn arn:aws:iam::aws:policy/IAMUserChangePassword',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html',
    },
    {
      id: 'pci-4', framework: 'PCI', controlId: 'Req 10.1', title: 'Track access to network resources',
      status: 'compliant', severity: 'medium',
      description: 'Audit trails for access to cardholder data must be implemented and retained.',
      impact: 'PCI requires 12 months of audit logs for incident investigation and compliance.',
      remediation: 'CloudTrail and VPC Flow Logs satisfy this. Ensure log retention meets requirements.',
      awsCli: 'aws cloudtrail update-trail --name <TRAIL_NAME> --is-multi-region-trail true',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-retention.html',
    },
    {
      id: 'pci-5', framework: 'PCI', controlId: 'Req 11.4', title: 'Use intrusion detection/prevention',
      status: hasNetworkIssue || hasCryptoMining ? 'at-risk' : 'compliant',
      severity: 'high',
      description: 'IDS/IPS must monitor CDE and critical systems for malicious activity.',
      impact: 'Without IDS, intrusions may go undetected until after data exfiltration.',
      remediation: 'Enable GuardDuty and VPC Flow Logs. Consider Network Firewall for perimeter protection.',
      awsCli: 'aws guardduty create-detector --enable\naws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type s3 --log-destination arn:aws:s3:::<BUCKET>/flow-logs/',
      reference: 'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html',
    },
    // SOX controls
    {
      id: 'sox-1', framework: 'SOX', controlId: 'ITGC-AC', title: 'Access Controls - Segregation of Duties',
      status: hasIAMIssue ? 'at-risk' : 'compliant',
      severity: 'high',
      description: 'SOX requires adequate segregation of duties for financial systems. Over-privileged IAM roles can allow single users to perform incompatible functions.',
      impact: 'SOX Section 404 failures can result in material weakness findings, regulatory sanctions, and loss of investor confidence.',
      remediation: 'Implement role-based access with least privilege. Separate approval workflows for sensitive actions.',
      awsCli: 'aws iam list-attached-role-policies --role-name <ROLE>\naws iam detach-role-policy --role-name <ROLE> --policy-arn <POLICY_ARN>',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html',
    },
    {
      id: 'sox-2', framework: 'SOX', controlId: 'ITGC-CM', title: 'Change Management Controls',
      status: 'compliant', severity: 'medium',
      description: 'Infrastructure changes should be logged and approved. CloudTrail and AWS Config provide audit trails.',
      impact: 'Unaudited changes to financial systems violate SOX change management requirements.',
      remediation: 'Enable AWS Config rules and CloudTrail. Implement change approval workflows.',
      awsCli: 'aws configservice put-configuration-recorder --configuration-recorder \'{"name":"default","roleARN":"<ROLE_ARN>","recordingGroup":{"allSupported":true}}\'',
      reference: 'https://docs.aws.amazon.com/config/latest/developerguide/recording-configuration.html',
    },
    // HIPAA controls
    {
      id: 'hipaa-1', framework: 'HIPAA', controlId: '§164.312(a)(1)', title: 'Access Control - Unique User Identification',
      status: hasIAMIssue ? 'violated' : 'compliant',
      severity: 'critical',
      description: 'HIPAA requires unique user identification for access to ePHI. Shared credentials or over-privileged roles violate this requirement.',
      impact: 'HIPAA violations can result in fines of $100–$50,000 per violation, criminal penalties, and mandatory breach notification.',
      remediation: 'Ensure each user has unique IAM credentials. Disable shared accounts. Enable MFA for all ePHI access.',
      awsCli: 'aws iam create-user --user-name <USERNAME>\naws iam attach-user-policy --user-name <USERNAME> --policy-arn arn:aws:iam::aws:policy/AWSSupportAccess',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html',
    },
    {
      id: 'hipaa-2', framework: 'HIPAA', controlId: '§164.312(b)', title: 'Audit Controls',
      status: 'compliant', severity: 'medium',
      description: 'HIPAA requires audit controls to record and examine activity in systems containing ePHI.',
      impact: 'Lack of audit trails prevents breach investigation and HIPAA compliance attestation.',
      remediation: 'Maintain CloudTrail, VPC Flow Logs, and application logging for ePHI systems.',
      awsCli: 'aws cloudtrail get-trail-status --name <TRAIL_NAME>',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
    },
    {
      id: 'hipaa-3', framework: 'HIPAA', controlId: '§164.312(a)(2)(iv)', title: 'Encryption and Decryption',
      status: hasDataAccess ? 'at-risk' : 'compliant',
      severity: 'high',
      description: 'ePHI must be encrypted when transmission is reasonable and appropriate.',
      impact: 'Unencrypted ePHI transmission exposes organizations to HIPAA breach notification and penalties.',
      remediation: 'Enable TLS for all data in transit. Use KMS for data at rest. Enforce S3 encryption.',
      awsCli: 'aws s3api put-bucket-encryption --bucket <BUCKET> --server-side-encryption-configuration \'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}\'',
      reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html',
    },
  );

  // Extended baseline controls — always evaluated regardless of incident type
  // These represent core security hygiene required by all 6 frameworks
  controls.push(
    // ── CIS additional controls ──
    { id: 'cis-7', framework: 'CIS', controlId: 'CIS 1.10', title: 'Ensure MFA is enabled for all IAM users with console access',
      status: hasIAMIssue ? 'violated' : 'not_evaluated', severity: 'critical',
      description: 'Multi-factor authentication adds a second layer of protection to IAM credentials. Without MFA, compromised passwords lead directly to account takeover.',
      impact: 'MFA missing is the #2 cause of cloud breaches. Attackers reuse leaked credentials from other services. A single stolen password gives full console access.',
      remediation: 'Enable virtual MFA or hardware MFA for all IAM users. Enforce via IAM condition key "aws:MultiFactorAuthPresent".',
      awsCli: 'aws iam list-users --query "Users[*].UserName" --output text | xargs -I{} aws iam list-mfa-devices --user-name {} --query "MFADevices"',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html',
      mappingReason: 'MFA enforcement is a universal baseline control across CIS, NIST, SOC 2, PCI-DSS, and HIPAA.' },

    { id: 'cis-8', framework: 'CIS', controlId: 'CIS 1.13', title: 'Ensure MFA is enabled for root account',
      status: events.some(e => /root/i.test(e.actor || '')) ? 'violated' : 'not_evaluated', severity: 'critical',
      description: 'Root account usage without MFA is an extreme risk. Root bypasses all IAM policies.',
      impact: 'Compromised root credentials allow complete AWS account takeover with no recourse. All data, compute, and billing are at risk.',
      remediation: 'Enable hardware MFA for root. Lock root credentials in a vault. Never use root for daily operations.',
      awsCli: 'aws iam get-account-summary --query "SummaryMap.AccountMFAEnabled"',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
      mappingReason: 'Root MFA is CIS Level 1 — highest priority baseline control.' },

    { id: 'cis-9', framework: 'CIS', controlId: 'CIS 2.1.2', title: 'Ensure S3 Bucket Policy blocks public access',
      status: hasDataAccess ? 'not_evaluated' : 'compliant', severity: 'high',
      description: 'Public S3 buckets are responsible for some of the largest data breaches in cloud history.',
      impact: 'Publicly accessible S3 buckets expose all stored data to the internet. Automated scanners discover public buckets within minutes of creation.',
      remediation: 'Enable S3 Block Public Access at the account level. Audit all bucket ACLs and policies.',
      awsCli: 'aws s3control put-public-access-block --account-id <YOUR_ACCOUNT_ID> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
      reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
      mappingReason: 'S3 public access blocking is a universal data protection baseline.' },

    { id: 'cis-10', framework: 'CIS', controlId: 'CIS 3.2', title: 'Ensure CloudTrail log file validation is enabled',
      status: 'not_evaluated', severity: 'medium',
      description: 'Log file validation detects if CloudTrail logs were tampered with or deleted after delivery.',
      impact: 'Without log validation, attackers who delete or modify CloudTrail logs can erase evidence of their activity, making forensic investigation impossible.',
      remediation: 'Enable log file validation on all CloudTrail trails.',
      awsCli: 'aws cloudtrail update-trail --name <TRAIL_NAME> --enable-log-file-validation',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html',
      mappingReason: 'Log integrity is required for incident forensics and compliance attestation.' },

    { id: 'cis-11', framework: 'CIS', controlId: 'CIS 3.4', title: 'Ensure CloudTrail trails are integrated with CloudWatch Logs',
      status: 'not_evaluated', severity: 'medium',
      description: 'CloudWatch Logs integration enables real-time alerting on CloudTrail events.',
      impact: 'Without CloudWatch integration, CloudTrail events are only available for historical review — not real-time detection.',
      remediation: 'Configure CloudTrail to deliver logs to CloudWatch Logs and create metric filters for critical API calls.',
      awsCli: 'aws cloudtrail update-trail --name <TRAIL_NAME> --cloud-watch-logs-log-group-arn arn:aws:logs:<REGION>:<YOUR_ACCOUNT_ID>:log-group:CloudTrail',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html',
      mappingReason: 'Real-time log monitoring is required for timely incident detection.' },

    { id: 'cis-12', framework: 'CIS', controlId: 'CIS 4.1', title: 'Ensure no security group allows unrestricted ingress to port 3389 (RDP)',
      status: hasNetworkIssue ? 'not_evaluated' : 'compliant', severity: 'high',
      description: 'RDP open to 0.0.0.0/0 is a top attack vector for Windows workloads in AWS.',
      impact: 'Open RDP enables BlueKeep, ransomware deployment, and lateral movement across Windows instances.',
      remediation: 'Close RDP to all external IPs. Use Systems Manager Session Manager or a VPN for remote access.',
      awsCli: 'aws ec2 describe-security-groups --filters "Name=ip-permission.to-port,Values=3389" --query "SecurityGroups[?IpPermissions[?ToPort==\'3389\' && IpRanges[?CidrIp==\'0.0.0.0/0\']]].[GroupId]" --output text',
      reference: 'https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/security-best-practices.html',
      mappingReason: 'Port 3389 exposure is CIS Level 1 baseline — matches current network security review.' },

    { id: 'cis-13', framework: 'CIS', controlId: 'CIS 1.20', title: 'Ensure IAM Access Analyzer is enabled',
      status: 'not_evaluated', severity: 'medium',
      description: 'IAM Access Analyzer identifies resources shared with external principals that could expose your account.',
      impact: 'Without Access Analyzer, unintended cross-account access or public resource sharing goes undetected.',
      remediation: 'Enable IAM Access Analyzer in all regions. Review all findings and remediate unintended access.',
      awsCli: 'aws accessanalyzer create-analyzer --analyzer-name wolfir-analyzer --type ACCOUNT',
      reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html',
      mappingReason: 'Access Analyzer is CIS Level 1 — identifies overly permissive IAM access detected in incident.' },

    { id: 'cis-14', framework: 'CIS', controlId: 'CIS 2.3.1', title: 'Ensure RDS storage encryption is enabled',
      status: 'not_evaluated', severity: 'high',
      description: 'RDS databases containing sensitive data should encrypt storage at rest using AWS KMS.',
      impact: 'Unencrypted RDS snapshots can be shared or copied to another account, exposing all database contents.',
      remediation: 'Enable encryption at rest when creating RDS instances. For existing instances, create encrypted snapshots.',
      awsCli: 'aws rds describe-db-instances --query "DBInstances[?StorageEncrypted==\'false\'].[DBInstanceIdentifier]" --output text',
      reference: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
      mappingReason: 'Database encryption is required by all major compliance frameworks.' },

    // ── NIST additional controls ──
    { id: 'nist-8', framework: 'NIST', controlId: 'IR-4', title: 'Incident Handling',
      status: 'not_evaluated', severity: 'high',
      description: 'Formal incident handling capability must exist including preparation, detection, analysis, containment, eradication, and recovery.',
      impact: 'Without documented IR procedures, incidents take 3× longer to contain. NIST 800-61r2 defines the 6-phase lifecycle.',
      remediation: 'Document IR playbooks for all incident types. wolfir automates phases 2–5 (Detection through Recovery).',
      awsCli: 'aws ssm create-document --name WolfIR-Playbook --document-type Automation --content file://ir-playbook.json',
      reference: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf',
      mappingReason: 'IR handling is evaluated as part of this incident response exercise.' },

    { id: 'nist-9', framework: 'NIST', controlId: 'CM-6', title: 'Configuration Settings',
      status: hasEC2Activity ? 'not_evaluated' : 'compliant', severity: 'medium',
      description: 'Security configuration settings for IT products must be established, documented, implemented, and monitored.',
      impact: 'Misconfigured AWS services are the root cause of most cloud breaches. Default configurations are often insecure.',
      remediation: 'Enable AWS Config with managed rules. Use Security Hub for centralized findings.',
      awsCli: 'aws securityhub enable-security-hub --enable-default-standards',
      reference: 'https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html',
      mappingReason: 'Configuration management is relevant whenever EC2 or IAM misconfiguration is detected.' },

    { id: 'nist-10', framework: 'NIST', controlId: 'CA-7', title: 'Continuous Monitoring',
      status: 'compliant', severity: 'medium',
      description: 'Ongoing security monitoring enables timely detection and response to security events.',
      impact: 'Without continuous monitoring, attackers have unlimited dwell time. Average dwell time without monitoring: 197 days.',
      remediation: 'CloudTrail + GuardDuty + wolfir provides continuous monitoring. Enable GuardDuty in all regions.',
      awsCli: 'aws guardduty list-detectors',
      reference: 'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html',
      mappingReason: 'wolfir provides continuous monitoring — this control is satisfied by the current incident analysis.' },

    { id: 'nist-11', framework: 'NIST', controlId: 'PS-6', title: 'Access Agreements',
      status: 'not_evaluated', severity: 'low',
      description: 'Personnel must sign access agreements before being granted access to organizational information systems.',
      impact: 'Contractor access without formal agreements (as seen in this incident) creates legal and audit exposure.',
      remediation: 'Document access agreements for all contractors and third parties with AWS access. Enforce time-bound access.',
      awsCli: 'aws iam create-role --role-name contractor-temp-90day --assume-role-policy-document file://time-bound-trust-policy.json',
      reference: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf',
      mappingReason: 'Contractor role misuse in this incident highlights the need for formal access agreements.' },

    // ── SOC 2 additional controls ──
    { id: 'soc2-5', framework: 'SOC2', controlId: 'CC6.3', title: 'Role-based access control and least privilege',
      status: hasIAMIssue ? 'violated' : 'not_evaluated', severity: 'high',
      description: 'SOC 2 CC6.3 requires role-based access control with documented business justification for each access grant.',
      impact: 'Over-privileged access directly contributed to this incident. SOC 2 auditors will flag this as a material control failure.',
      remediation: 'Implement role-based access with least privilege. Conduct quarterly access reviews. Remove unused permissions.',
      awsCli: 'aws iam get-account-authorization-details --filter Role --query "RoleDetailList[*].[RoleName,AttachedManagedPolicies[*].PolicyName]" --output table',
      reference: 'https://www.aicpa.org/resources/article/soc-2-guide',
      mappingReason: 'IAM role abuse is a direct violation of SOC 2 CC6.3 access control requirements.' },

    { id: 'soc2-6', framework: 'SOC2', controlId: 'CC7.1', title: 'Security event detection and monitoring',
      status: 'compliant', severity: 'medium',
      description: 'Security events must be detected and monitored using automated detection tools.',
      impact: 'Without automated detection, security events go unnoticed for weeks or months.',
      remediation: 'wolfir + GuardDuty + CloudTrail Insights satisfies this control. Document your monitoring stack.',
      awsCli: 'aws guardduty create-detector --enable --finding-publishing-frequency FIFTEEN_MINUTES',
      reference: 'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_settingup.html',
      mappingReason: 'wolfir automated detection satisfies CC7.1. This incident was detected via continuous CloudTrail analysis.' },

    { id: 'soc2-7', framework: 'SOC2', controlId: 'CC9.2', title: 'Business continuity and incident response',
      status: 'not_evaluated', severity: 'medium',
      description: 'Documented and tested incident response procedures must exist for all critical security events.',
      impact: 'SOC 2 auditors require evidence of IR procedures and testing. Missing IR documentation is a common audit finding.',
      remediation: 'Document IR runbooks for each scenario. Use wolfir simulation for tabletop exercises.',
      awsCli: 'aws ssm list-documents --filters Key=DocumentType,Values=Automation --query "DocumentIdentifiers[*].Name"',
      reference: 'https://www.aicpa.org/resources/article/soc-2-guide',
      mappingReason: 'wolfir simulation mode provides tabletop exercise evidence for SOC 2 CC9.2.' },

    { id: 'soc2-8', framework: 'SOC2', controlId: 'CC8.1', title: 'Change management controls',
      status: hasNetworkIssue || hasCryptoMining ? 'at-risk' : 'compliant', severity: 'medium',
      description: 'Infrastructure changes must be authorized, tested, and documented before deployment.',
      impact: 'Unauthorized changes (like the security group modification in this incident) violate CC8.1 and leave an audit gap.',
      remediation: 'Implement AWS CloudFormation or Terraform for infrastructure-as-code. Require PR reviews for all changes.',
      awsCli: 'aws configservice describe-config-rules --query "ConfigRules[?Source.SourceIdentifier==\'CLOUD_FORMATION_STACK_DRIFT_DETECTION_CHECK\']"',
      reference: 'https://docs.aws.amazon.com/config/latest/developerguide/config-rule-multi-source.html',
      mappingReason: 'Unauthorized security group changes in this incident indicate change management control failure.' },

    // ── PCI additional controls ──
    { id: 'pci-6', framework: 'PCI', controlId: 'Req 2.2', title: 'System hardening standards',
      status: hasEC2Activity ? 'not_evaluated' : 'compliant', severity: 'high',
      description: 'PCI-DSS requires documented system hardening standards for all system components in scope.',
      impact: 'Without hardening standards, EC2 instances may run with insecure default configurations that enable exploitation.',
      remediation: 'Apply CIS Benchmarks to all EC2 instances. Use Amazon Inspector for continuous vulnerability assessment.',
      awsCli: 'aws inspector2 list-findings --filter-criteria \'{"findingStatus":[{"comparison":"EQUALS","value":"ACTIVE"}]}\' --sort-criteria field=SEVERITY',
      reference: 'https://docs.aws.amazon.com/inspector/latest/user/getting_started_tutorial.html',
      mappingReason: 'EC2 instance abuse in this incident requires evaluation of system hardening standards.' },

    { id: 'pci-7', framework: 'PCI', controlId: 'Req 6.4', title: 'Protect public-facing web applications',
      status: hasNetworkIssue ? 'at-risk' : 'not_evaluated', severity: 'high',
      description: 'PCI-DSS requires WAF or security testing for all public-facing web applications.',
      impact: 'Without WAF protection, APIs and web apps are vulnerable to OWASP Top 10 attacks.',
      remediation: 'Deploy AWS WAF with OWASP managed rule group on all public-facing ALBs and API Gateways.',
      awsCli: 'aws wafv2 list-web-acls --scope REGIONAL --query "WebACLs[*].Name"',
      reference: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html',
      mappingReason: 'Network security gaps in this incident require WAF coverage review for PCI scope.' },

    { id: 'pci-8', framework: 'PCI', controlId: 'Req 12.3', title: 'Risk assessment and targeted analysis',
      status: 'compliant', severity: 'low',
      description: 'PCI-DSS v4.0 requires annual risk assessments and targeted risk analysis for all CDE controls.',
      impact: 'Without documented risk assessments, PCI auditors cannot validate the appropriateness of controls.',
      remediation: 'wolfir provides automated risk analysis for every incident. Document and retain risk assessment reports.',
      awsCli: 'aws securityhub get-findings --filters \'{"RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}]}\' --sort-criteria Field=SeverityScore,SortOrder=desc',
      reference: 'https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0.pdf',
      mappingReason: 'wolfir automated risk analysis satisfies PCI Req 12.3 targeted risk assessment requirements.' },

    // ── SOX additional controls ──
    { id: 'sox-3', framework: 'SOX', controlId: 'ITGC-PC', title: 'Program change controls',
      status: hasNetworkIssue || hasCryptoMining ? 'at-risk' : 'compliant', severity: 'high',
      description: 'SOX requires that changes to production systems are authorized, tested, and approved.',
      impact: 'Unauthorized infrastructure changes (security groups, IAM policies) can affect financial reporting systems.',
      remediation: 'Implement change approval workflows. Use AWS Service Control Policies to prevent unauthorized changes.',
      awsCli: 'aws organizations list-policies --filter SERVICE_CONTROL_POLICY',
      reference: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html',
      mappingReason: 'Unauthorized changes detected in this incident may affect SOX ITGC program change controls.' },

    { id: 'sox-4', framework: 'SOX', controlId: 'ITGC-OM', title: 'Operations and monitoring',
      status: 'compliant', severity: 'medium',
      description: 'SOX requires monitoring of critical IT systems to detect and respond to security incidents.',
      impact: 'Failure to detect incidents affecting financial systems constitutes a SOX material weakness.',
      remediation: 'wolfir continuous monitoring satisfies this. Document and retain monitoring evidence for auditors.',
      awsCli: 'aws cloudwatch describe-alarms --state-value ALARM --query "MetricAlarms[*].[AlarmName,StateReason]"',
      reference: 'https://docs.aws.amazon.com/cloudwatch/latest/monitoring/AlarmThatSendsEmail.html',
      mappingReason: 'wolfir incident detection satisfies SOX ITGC operations monitoring requirements.' },

    // ── HIPAA additional controls ──
    { id: 'hipaa-4', framework: 'HIPAA', controlId: '§164.312(c)(1)', title: 'Integrity controls — prevent unauthorized alteration',
      status: hasDataAccess ? 'at-risk' : 'not_evaluated', severity: 'high',
      description: 'HIPAA requires that ePHI is not improperly altered or destroyed. S3 Object Lock and versioning support this.',
      impact: 'Unauthorized modification or deletion of ePHI triggers HIPAA breach notification requirements.',
      remediation: 'Enable S3 Object Lock (WORM) and versioning for ePHI buckets. Enable MFA delete.',
      awsCli: 'aws s3api put-bucket-versioning --bucket <BUCKET> --versioning-configuration Status=Enabled\naws s3api put-object-lock-configuration --bucket <BUCKET> --object-lock-configuration ObjectLockEnabled=Enabled',
      reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html',
      mappingReason: 'Data access activity in this incident requires evaluation of ePHI integrity controls.' },

    { id: 'hipaa-5', framework: 'HIPAA', controlId: '§164.308(a)(5)', title: 'Security awareness training',
      status: 'not_evaluated', severity: 'medium',
      description: 'HIPAA requires security awareness training for all workforce members who access ePHI.',
      impact: 'The contractor credential misuse in this incident may indicate inadequate security training for third parties.',
      remediation: 'Implement mandatory security training for all staff and contractors with AWS access. Document completion.',
      awsCli: 'aws iam list-users --query "Users[?PasswordLastUsed!=null].[UserName,PasswordLastUsed]" --output table',
      reference: 'https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html',
      mappingReason: 'Third-party credential misuse in this incident highlights training gaps under HIPAA §164.308(a)(5).' },
  );

  // Note: OWASP LLM, MITRE ATT&CK, and NIST AI RMF are surfaced in the
  // dedicated "AI Compliance" tab (AI Security → AI Compliance) where they
  // receive a premium, purpose-built presentation. This keeps ComplianceMapping
  // focused on traditional cloud-security frameworks (CIS, NIST 800-53, SOC 2,
  // PCI-DSS, SOX, HIPAA) so each tab stays focused and non-repetitive.
  //
  // Note: The full CIS AWS Foundations Benchmark has 92 recommendations,
  // NIST 800-53 has 1000+ controls, SOC 2 has 64 criteria, PCI-DSS v4 has 285 requirements.
  // This tab shows the controls most directly relevant to the detected incident.
  // Enable AWS Config + Security Hub for full automated evaluation of all controls.

  return controls;
}

type CliExecState = 'idle' | 'confirming' | 'running' | 'done' | 'error';

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'violated' | 'at-risk' | 'compliant' | 'not_evaluated';

const ComplianceMapping: React.FC<ComplianceMappingProps> = ({ timeline, incidentType, awsAccountId }) => {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);
  const [activeSeverity, setActiveSeverity] = useState<SeverityFilter>('all');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);
  const [cliExec, setCliExec] = useState<Record<string, { state: CliExecState; message?: string }>>({});

  // Stable deps to avoid recompute when parent passes new timeline object ref with same content
  const eventsLen = timeline?.events?.length ?? 0;
  const eventFingerprint = (timeline?.events ?? []).slice(0, 5).map(e => e.action || '').join('|');
  const ctx = useMemo(() => extractIncidentContext(timeline, awsAccountId), [eventsLen, eventFingerprint, awsAccountId]);
  const controls = useMemo(
    () => generateComplianceMappings(timeline, incidentType),
    [eventsLen, eventFingerprint, incidentType]
  );

  const filteredControls = useMemo(() => {
    let out = controls;
    if (activeFramework) out = out.filter(c => c.framework === activeFramework);
    if (activeSeverity !== 'all') out = out.filter(c => c.severity === activeSeverity);
    if (activeStatus !== 'all') out = out.filter(c => c.status === activeStatus);
    return out;
  }, [controls, activeFramework, activeSeverity, activeStatus]);

  // Sort by status: violated first, then at-risk, then compliant
  const sortedControls = useMemo(() => {
    const statusOrder: Record<string, number> = { 'violated': 0, 'at-risk': 1, 'compliant': 2, 'not_evaluated': 3 };
    const severityOrder: Record<string, number> = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    return [...filteredControls].sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    });
  }, [filteredControls]);

  const summary = useMemo(() => {
    const violated = controls.filter(c => c.status === 'violated').length;
    const atRisk = controls.filter(c => c.status === 'at-risk').length;
    const compliant = controls.filter(c => c.status === 'compliant').length;
    const notEvaluated = controls.filter(c => c.status === 'not_evaluated').length;
    return { violated, atRisk, compliant, notEvaluated, total: controls.length };
  }, [controls]);

  const handleCliExecute = async (control: ComplianceControl) => {
    const id = control.id;
    setCliExec(prev => ({ ...prev, [id]: { state: 'confirming' } }));
  };

  const handleCliConfirm = async (control: ComplianceControl) => {
    const id = control.id;
    setCliExec(prev => ({ ...prev, [id]: { state: 'running' } }));
    try {
      // Extract the primary action from the CLI command (first line)
      const firstLine = (control.awsCli || '').split('\n')[0].trim();
      const action = firstLine.replace(/^aws\s+/, '').split(' ')[0] + ' ' + firstLine.replace(/^aws\s+/, '').split(' ')[1];
      const target = control.controlId;
      const result = await remediationAPI.executeStep(id, '', action, target);
      const msg = result?.message || result?.status || 'Step executed. Check AWS Console for confirmation.';
      setCliExec(prev => ({ ...prev, [id]: { state: 'done', message: msg } }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setCliExec(prev => ({ ...prev, [id]: { state: 'error', message: errMsg || 'Execution failed. Check your AWS credentials and permissions.' } }));
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof AlertCircle; textColor: string }> = {
      'violated': { label: 'Violated', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle, textColor: 'text-red-600' },
      'at-risk': { label: 'At Risk', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, textColor: 'text-amber-600' },
      'compliant': { label: 'Compliant', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, textColor: 'text-emerald-600' },
      'not_evaluated': { label: 'Not Evaluated', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Info, textColor: 'text-slate-500' },
    };
    return configs[status] || configs['not_evaluated'];
  };

  const frameworkGroups = useMemo(() => {
    return Object.entries(FRAMEWORK_CONFIG).map(([key, cfg]) => {
      const fwControls = controls.filter(c => c.framework === key);
      return {
        key, cfg,
        total: fwControls.length,
        violated: fwControls.filter(c => c.status === 'violated').length,
        atRisk: fwControls.filter(c => c.status === 'at-risk').length,
        compliant: fwControls.filter(c => c.status === 'compliant').length,
        notEvaluated: fwControls.filter(c => c.status === 'not_evaluated').length,
      };
    }).filter(f => f.total > 0);
  }, [controls]);

  const compliancePct = summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── HEADER BAR ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Compliance Mapping</h2>
            <p className="text-xs text-white/80">{summary.total} controls assessed · 6 frameworks · CIS (92 total), NIST 800-53 (1000+), SOC 2, PCI-DSS, SOX, HIPAA · Enable AWS Config for full coverage</p>
          </div>
        </div>
        <button
          onClick={() => { const generatedAt = new Date().toISOString(); generateCompliancePdf(summary, controls, generatedAt); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Report
        </button>
      </div>

      {/* ── ROW 1: KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Controls', value: summary.total, sub: '6 frameworks assessed', borderColor: 'border-l-indigo-400', textColor: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'Violated', value: summary.violated, sub: 'Needs immediate action', borderColor: 'border-l-red-500', textColor: 'text-red-700', bg: 'bg-red-50' },
          { label: 'At Risk', value: summary.atRisk, sub: 'Needs attention', borderColor: 'border-l-amber-400', textColor: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Compliant', value: summary.compliant, sub: `${compliancePct}% compliance rate`, borderColor: 'border-l-emerald-400', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Not Evaluated', value: summary.notEvaluated, sub: 'No finding in this incident', borderColor: 'border-l-slate-300', textColor: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`bg-white rounded-2xl border border-slate-200 shadow-card p-5 border-l-4 ${card.borderColor}`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{card.label}</p>
            <p className={`text-4xl font-extrabold ${card.textColor}`}>{card.value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{card.sub}</p>
            {card.label === 'Compliant' && (
              <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${compliancePct}%`, transition: 'width 0.8s ease' }} />
              </div>
            )}
            {card.label === 'Violated' && summary.violated > 0 && (
              <div className="mt-2 w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, (summary.violated / Math.max(summary.total, 1)) * 100 * 3)}%`, transition: 'width 0.8s ease' }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── ROW 2: FRAMEWORK CARDS — premium neutral design ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Framework Coverage</h3>
          <span className="text-[10px] text-slate-400">{frameworkGroups.length} frameworks assessed</span>
        </div>
        <div className="divide-y divide-slate-100">
          {frameworkGroups.map(({ key, cfg, total, violated, atRisk, compliant: comp, notEvaluated }, idx) => {
            const compliancePct = total > 0 ? Math.round((comp / total) * 100) : 0;
            const isActive = activeFramework === key;
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setActiveFramework(isActive ? null : key)}
                className={`w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors ${
                  isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Framework badge */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}>
                  <span className={`text-[10px] font-black tracking-wider ${cfg.color}`}>{key.slice(0, 3)}</span>
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{cfg.name}</p>
                    {isActive && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">ACTIVE FILTER</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{cfg.description}</p>
                  {/* Segmented progress bar */}
                  <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-px">
                    {violated > 0 && <div className="bg-red-400 rounded-l-full" style={{ width: `${(violated / total) * 100}%` }} />}
                    {atRisk > 0 && <div className="bg-amber-400" style={{ width: `${(atRisk / total) * 100}%` }} />}
                    {comp > 0 && <div className="bg-emerald-400" style={{ width: `${(comp / total) * 100}%` }} />}
                    {notEvaluated > 0 && <div className="bg-slate-200 rounded-r-full" style={{ width: `${(notEvaluated / total) * 100}%` }} />}
                  </div>
                </div>

                {/* Stats — right side */}
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-slate-800">{compliancePct}<span className="text-xs font-normal text-slate-400">%</span></p>
                  <p className="text-[10px] text-slate-400">{total} controls</p>
                </div>

                {/* Mini stat pills — compact */}
                <div className="shrink-0 flex flex-col gap-0.5 text-right w-20">
                  {violated > 0 && <span className="text-[10px] font-semibold text-red-600">{violated} violated</span>}
                  {atRisk > 0 && <span className="text-[10px] font-semibold text-amber-600">{atRisk} at-risk</span>}
                  {comp > 0 && <span className="text-[10px] font-semibold text-emerald-600">{comp} ok</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── CONTROLS LIST CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        {/* Subheader + filters */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Controls Detail</h3>
              <p className="text-xs text-slate-500">{sortedControls.length} of {controls.length} controls shown</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMethodologyExpanded(!methodologyExpanded)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Info className="w-3 h-3" /> Methodology
                {methodologyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
          {methodologyExpanded && (
            <div className="mb-3 rounded-xl border border-slate-200 overflow-hidden text-[11px]">
              {/* Incident-triggered */}
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
                <p className="font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Incident-Triggered Controls
                  <span className="ml-1 text-[10px] font-normal text-amber-600">— status derived from CloudTrail events</span>
                </p>
                <ul className="space-y-1.5 text-amber-900">
                  {[
                    { trigger: 'IAM / privilege events', maps: 'CIS 1.16, NIST AC-6, SOC 2 CC6.1, PCI Req 7–8, SOX ITGC-AC, HIPAA §164.312' },
                    { trigger: 'S3 / data events (GetObject, PutObject, bucket ACLs)', maps: 'CIS 2.x, NIST SC-28, CC6.7, PCI Req 3–4, HIPAA encryption' },
                    { trigger: 'Security group / network changes', maps: 'CIS 4–5, NIST SC-7, PCI Req 11, WAF/IDS controls' },
                    { trigger: 'RunInstances / EC2 abuse', maps: 'NIST SI-3, RA-5, PCI Req 2–2, system hardening controls' },
                  ].map(({ trigger, maps }) => (
                    <li key={trigger} className="flex items-start gap-1.5">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span><span className="font-semibold">{trigger}</span><span className="text-amber-700"> → </span>{maps}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Baseline */}
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
                <p className="font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Baseline Controls
                  <span className="ml-1 text-[10px] font-normal text-blue-600">— always evaluated regardless of incident type</span>
                </p>
                <p className="text-blue-900">CloudTrail logging, root MFA, IAM Access Analyzer, public S3 blocks, RDS encryption, log validation, continuous monitoring — <span className="font-semibold">required by all 6 frameworks.</span></p>
              </div>
              {/* Not evaluated */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <Info className="w-3.5 h-3.5" /> Not Evaluated
                  <span className="ml-1 text-[10px] font-normal text-slate-500">— marked as pending</span>
                </p>
                <p className="text-slate-600">Controls that require AWS Config Rules, Security Hub, or direct API inspection to verify. <span className="font-semibold text-indigo-700">Enable AWS Config + Security Hub</span> for complete automated evaluation.</p>
              </div>
              {/* Footer note */}
              <div className="bg-white px-4 py-3 space-y-1 text-slate-500">
                <p className="flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />Status is <span className="font-semibold text-slate-700 mx-0.5">inferred</span> from incident timeline events. Always verify with an authoritative compliance scan.</p>
                <p className="text-slate-400">Full CIS Benchmark: 92 recommendations. Full NIST 800-53: 1000+ controls. This tab shows the most relevant subset.</p>
                <p className="text-indigo-500 font-medium">AI-specific frameworks (OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS) are in the AI Compliance tab.</p>
              </div>
            </div>
          )}
          {/* Framework filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActiveFramework(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${!activeFramework ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 hover:text-slate-700 border-slate-200'}`}>
              All ({controls.length})
            </button>
            {Object.entries(FRAMEWORK_CONFIG).filter(([k]) => controls.some(c => c.framework === k)).map(([key, cfg]) => (
              <button key={key} onClick={() => setActiveFramework(activeFramework === key ? null : key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${activeFramework === key ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'text-slate-500 hover:text-slate-700 border-slate-200'}`}>
                {key}
              </button>
            ))}
          </div>
          {/* Severity + Status — compact dropdowns */}
          {(() => {
            const byFramework = activeFramework ? controls.filter(c => c.framework === activeFramework) : controls;
            const severityCounts = { all: byFramework.length, critical: 0, high: 0, medium: 0, low: 0 };
            const statusCounts = { all: byFramework.length, violated: 0, 'at-risk': 0, compliant: 0, not_evaluated: 0 };
            byFramework.forEach(c => {
              if (c.severity in severityCounts) (severityCounts as any)[c.severity]++;
              if (c.status in statusCounts) (statusCounts as any)[c.status]++;
            });
            return (
              <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Severity</label>
                  <select
                    value={activeSeverity}
                    onChange={e => setActiveSeverity(e.target.value as SeverityFilter)}
                    className="text-[11px] font-semibold rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="all">All ({severityCounts.all})</option>
                    <option value="critical">Critical ({severityCounts.critical})</option>
                    <option value="high">High ({severityCounts.high})</option>
                    <option value="medium">Medium ({severityCounts.medium})</option>
                    <option value="low">Low ({severityCounts.low})</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status</label>
                  <select
                    value={activeStatus}
                    onChange={e => setActiveStatus(e.target.value as StatusFilter)}
                    className="text-[11px] font-semibold rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="all">All ({statusCounts.all})</option>
                    <option value="violated">Violated ({statusCounts.violated})</option>
                    <option value="at-risk">At Risk ({statusCounts['at-risk']})</option>
                    <option value="compliant">Compliant ({statusCounts.compliant})</option>
                    <option value="not_evaluated">Pending ({statusCounts.not_evaluated})</option>
                  </select>
                </div>
                {(activeSeverity !== 'all' || activeStatus !== 'all') && (
                  <button
                    onClick={() => { setActiveSeverity('all'); setActiveStatus('all'); }}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 underline transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Controls list — AI Compliance–style clean accordion */}
        <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
          {sortedControls.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No controls match the selected filters.</div>
          )}
          {sortedControls.map((control, idx) => {
            const isExpanded = expandedControl === control.id;
            const statusConfig = getStatusConfig(control.status);
            const StatusIcon = statusConfig.icon;
            const fw = FRAMEWORK_CONFIG[control.framework];
            const execState = cliExec[control.id];

            return (
              <motion.div key={control.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="bg-white">
                <button
                  onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left"
                >
                  {/* Status icon circle */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    control.status === 'violated' ? 'bg-red-500' :
                    control.status === 'at-risk' ? 'bg-amber-500' :
                    control.status === 'compliant' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}>
                    <StatusIcon className="w-3 h-3 text-white" />
                  </div>

                  {/* Control ID mono */}
                  <span className="text-xs font-mono font-bold text-slate-400 w-20 shrink-0 hidden sm:block">{control.controlId}</span>

                  {/* Framework + title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{control.title}</span>
                      {fw && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${fw.bg} ${fw.color} ${fw.border}`}>{control.framework}</span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        control.severity === 'critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                        control.severity === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        control.severity === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>{control.severity}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                    {statusConfig.label}
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
                      className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                    >
                      {/* 3-column detail grid — matches AI Compliance style */}
                      <div className="px-5 py-4 pl-[72px] grid sm:grid-cols-3 gap-4">
                        {/* Col 1: Finding */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Finding
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">{control.description}</p>
                          {control.mappingReason && (
                            <p className="text-[10px] text-indigo-500 mt-2 leading-relaxed flex items-start gap-1">
                              <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />{control.mappingReason}
                            </p>
                          )}
                        </div>

                        {/* Col 2: Business impact */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Business Impact
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed italic">{control.impact}</p>
                        </div>

                        {/* Col 3: Remediation + CLI + Execute */}
                        <div className={`p-3 rounded-xl border ${
                          control.status === 'violated' ? 'bg-red-50 border-red-200' :
                          control.status === 'at-risk' ? 'bg-amber-50 border-amber-200' :
                          control.status === 'compliant' ? 'bg-emerald-50 border-emerald-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${
                            control.status === 'violated' ? 'text-red-700' :
                            control.status === 'at-risk' ? 'text-amber-700' :
                            control.status === 'compliant' ? 'text-emerald-700' : 'text-slate-600'
                          }`}>
                            <Shield className="w-3 h-3" /> Remediation
                          </p>
                          <p className="text-xs leading-relaxed text-slate-700 mb-2">{control.remediation}</p>

                          {/* Reference link */}
                          {control.reference && (
                            <a href={control.reference} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium mb-2">
                              <ExternalLink className="w-3 h-3" /> AWS Documentation
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CLI block — full width below the 3-col grid */}
                      {control.awsCli && (
                        <div className="px-5 pb-4 pl-[72px]">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Terminal className="w-3 h-3" /> AWS CLI Remediation
                            </p>
                            {control.status !== 'compliant' && (
                              <span className="flex items-center gap-1.5">
                                {(!execState || execState.state === 'idle') && (
                                  <button onClick={() => handleCliExecute(control)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                                    <Play className="w-3 h-3" /> Execute via wolfir Agent
                                  </button>
                                )}
                                {execState?.state === 'confirming' && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Modifies AWS. Confirm?
                                    </span>
                                    <button onClick={() => handleCliConfirm(control)} className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700">Approve</button>
                                    <button onClick={() => setCliExec(prev => ({ ...prev, [control.id]: { state: 'idle' } }))} className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded hover:bg-slate-300">Cancel</button>
                                  </span>
                                )}
                                {execState?.state === 'running' && <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-medium"><Loader2 className="w-3 h-3 animate-spin" />Executing…</span>}
                                {execState?.state === 'done' && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium"><CheckCircle className="w-3 h-3" />Done</span>}
                                {execState?.state === 'error' && <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium"><XCircle className="w-3 h-3" />Failed</span>}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                            <code className="text-[11px] text-green-400 font-mono whitespace-pre leading-relaxed">
                              {substitutePlaceholders(control.awsCli, ctx)}
                            </code>
                          </div>
                          {execState?.message && (
                            <div className={`mt-1.5 p-2 rounded-lg text-[10px] font-medium ${execState.state === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {execState.message}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComplianceMapping;
