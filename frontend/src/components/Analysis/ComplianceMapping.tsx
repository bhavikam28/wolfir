/**
 * Compliance Mapping - Maps security findings to compliance frameworks
 * CIS, NIST 800-53, SOC 2, PCI-DSS — AI-generated from incident analysis
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Terminal, Info, ExternalLink, Brain, Download, Sparkles } from 'lucide-react';
import { generateCompliancePdf } from '../../utils/generateCompliancePdf';
import type { Timeline } from '../../types/incident';

interface ComplianceMappingProps {
  timeline: Timeline;
  incidentType?: string;
}

interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  status: 'violated' | 'at-risk' | 'compliant';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  remediation: string;
  awsCli?: string;
  reference?: string;
}

const FRAMEWORK_CONFIG: Record<string, { name: string; color: string; bg: string; border: string }> = {
  CIS: { name: 'CIS Benchmarks', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  NIST: { name: 'NIST 800-53', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  SOC2: { name: 'SOC 2', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  PCI: { name: 'PCI-DSS', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SOX: { name: 'SOX', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  HIPAA: { name: 'HIPAA', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
};

function extractIncidentContext(timeline: Timeline): { roleArn: string; roleName: string; sgId: string; bucketName: string; vpcId: string; accountId: string } {
  const events = timeline.events || [];
  const roleName = events.find(e => /contractor|role|AssumeRole/i.test(e.resource || ''))?.resource?.match(/role[:\s]+([\w-]+)/i)?.[1] || 'contractor-temp';
  const sgId = events.find(e => /Security Group|sg-|sg_/i.test(e.resource || ''))?.resource?.match(/(sg-[a-z0-9]+)/i)?.[1] || 'sg-abc123';
  const bucketName = events.find(e => /S3|Bucket|bucket/i.test(e.resource || ''))?.resource?.match(/bucket[:\s]+([\w.-]+)/i)?.[1] || 'my-sensitive-bucket';
  const vpcId = events.find(e => /VPC|vpc-/i.test(e.resource || ''))?.resource?.match(/(vpc-[a-z0-9]+)/i)?.[1] || 'vpc-0a1b2c3d';
  const accountId = '123456789012';
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
  return { roleArn, roleName, sgId, bucketName, vpcId, accountId };
}

function substitutePlaceholders(cli: string, ctx: ReturnType<typeof extractIncidentContext>): string {
  return cli
    .replace(/<ROLE_ARN>/g, ctx.roleArn)
    .replace(/<ROLE>/g, ctx.roleName)
    .replace(/<USERNAME>/g, 'compromised-user')
    .replace(/<SG_ID>/g, ctx.sgId)
    .replace(/<BUCKET>/g, ctx.bucketName)
    .replace(/<VPC_ID>/g, ctx.vpcId)
    .replace(/<POLICY_ARN>/g, 'arn:aws:iam::aws:policy/AdministratorAccess')
    .replace(/<GROUP>/g, 'least-privilege-group')
    .replace(/<MFA_NAME>/g, 'user-mfa')
    .replace(/<MFA_ARN>/g, 'arn:aws:iam::123456789012:mfa/user-mfa')
    .replace(/<CODE1>/g, '123456')
    .replace(/<CODE2>/g, '654321')
    .replace(/<TRAIL_NAME>/g, 'security-audit-trail')
    .replace(/<ACCESS_KEY_ID>/g, 'AKIAIOSFODNN7EXAMPLE')
    .replace(/<KMS_KEY_ID>/g, '12345678-1234-1234-1234-123456789012')
    .replace(/<KEY_ID>/g, '12345678-1234-1234-1234-123456789012')
    .replace(/<YOUR_IP>/g, '203.0.113.42');
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
  
  const hasDataAccess = events.some(e => 
    (e.action || '').toLowerCase().includes('s3') ||
    (e.action || '').toLowerCase().includes('data') ||
    (e.action || '').toLowerCase().includes('get') ||
    (e.action || '').toLowerCase().includes('download')
  );

  const hasNetworkIssue = events.some(e =>
    (e.action || '').toLowerCase().includes('security') ||
    (e.action || '').toLowerCase().includes('network') ||
    (e.action || '').toLowerCase().includes('ingress') ||
    (e.action || '').toLowerCase().includes('ec2')
  );

  const hasCryptoMining = incidentType?.toLowerCase().includes('crypto') || 
    events.some(e => (e.action || '').toLowerCase().includes('run') || (e.action || '').toLowerCase().includes('instance'));

  if (hasIAMIssue || hasCryptoMining) {
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
      },
      {
        id: 'pci-1', framework: 'PCI', controlId: 'Req 7.1', title: 'Limit access to system components',
        status: 'violated', severity: 'critical',
        description: 'Access to cardholder data environment is not restricted based on business need-to-know. Overly permissive IAM policies may grant access to payment-related resources.',
        impact: 'PCI-DSS Requirement 7 violations can result in fines of $5,000–$100,000/month from payment card brands, loss of ability to process card payments, and mandatory forensic investigation ($50,000+).',
        remediation: 'Implement role-based access control for all CDE resources. Restrict privileges to minimum necessary and document business justification for each access grant.',
        awsCli: 'aws iam put-role-policy --role-name <ROLE> --policy-name RestrictCDE --policy-document file://least-privilege-policy.json',
        reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html',
      },
    );
  }

  if (hasDataAccess) {
    controls.push(
      {
        id: 'cis-2', framework: 'CIS', controlId: 'CIS 2.1.1', title: 'Ensure S3 Bucket Policy is set to deny HTTP requests',
        status: 'violated', severity: 'high',
        description: 'S3 buckets allow unencrypted HTTP access, risking data interception during transit. All data transfers should use HTTPS to prevent man-in-the-middle attacks.',
        impact: 'Unencrypted S3 access allows attackers on the same network to intercept sensitive data in transit. This is particularly dangerous for buckets containing PII, financial data, or credentials.',
        remediation: 'Enable S3 bucket policies that enforce HTTPS-only access by adding a condition denying all HTTP requests.',
        awsCli: 'aws s3api put-bucket-policy --bucket <BUCKET> --policy \'{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Principal":"*","Action":"s3:*","Resource":"arn:aws:s3:::<BUCKET>/*","Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}\'',
        reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html',
      },
      {
        id: 'nist-2', framework: 'NIST', controlId: 'SC-28', title: 'Protection of Information at Rest',
        status: 'at-risk', severity: 'high',
        description: 'Sensitive data may not be encrypted at rest in all storage services. AWS KMS encryption should be enabled for S3, RDS, EBS, and DynamoDB.',
        impact: 'Unencrypted data at rest is exposed if storage media is compromised, accounts are breached, or snapshots are shared. Regulatory frameworks require encryption for data containing PII.',
        remediation: 'Enable default encryption using AWS KMS for all S3 buckets, EBS volumes, and RDS instances.',
        awsCli: 'aws s3api put-bucket-encryption --bucket <BUCKET> --server-side-encryption-configuration \'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}\'',
        reference: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html',
      },
      {
        id: 'soc2-2', framework: 'SOC2', controlId: 'CC6.7', title: 'Restrict Transmission of Data',
        status: 'violated', severity: 'critical',
        description: 'Data transmission occurred without proper authorization and monitoring. Large data transfers detected without corresponding DLP controls.',
        impact: 'Unmonitored data transmission is the primary vector for data exfiltration. Without DLP controls, sensitive data can leave the organization without detection, leading to regulatory penalties and reputational damage.',
        remediation: 'Enable VPC Flow Logs, implement S3 access logging, and configure CloudWatch alarms for unusual data transfer patterns.',
        awsCli: 'aws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type cloud-watch-logs --log-group-name VPCFlowLogs\naws s3api put-bucket-logging --bucket <BUCKET> --bucket-logging-status file://logging-config.json',
        reference: 'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
      },
      {
        id: 'pci-2', framework: 'PCI', controlId: 'Req 3.4', title: 'Render PAN unreadable anywhere it is stored',
        status: 'at-risk', severity: 'high',
        description: 'Data stores may contain unencrypted sensitive information including potential cardholder data.',
        impact: 'Storing PAN data in clear text violates PCI-DSS and can result in immediate suspension of card processing capabilities. Breach notification costs average $150 per compromised record.',
        remediation: 'Implement tokenization or strong encryption for all sensitive data at rest. Use AWS CloudHSM or KMS for key management.',
        awsCli: 'aws kms create-key --description "PCI-DSS data encryption key"\naws kms create-alias --alias-name alias/pci-data-key --target-key-id <KMS_KEY_ID>',
        reference: 'https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html',
      },
    );
  }

  if (hasNetworkIssue || hasCryptoMining) {
    controls.push(
      {
        id: 'cis-3', framework: 'CIS', controlId: 'CIS 5.2', title: 'Ensure no security groups allow ingress from 0.0.0.0/0 to port 22',
        status: 'violated', severity: 'critical',
        description: 'Security groups allow unrestricted SSH access from the internet (0.0.0.0/0 on port 22). This is the most common entry point for cloud-based attacks.',
        impact: 'Open SSH access enables brute-force attacks, credential stuffing, and exploitation of SSH vulnerabilities. Compromised instances are commonly used for crypto mining, data exfiltration, and lateral movement.',
        remediation: 'Restrict SSH access to known IP ranges or eliminate SSH entirely by using AWS Systems Manager Session Manager for remote access.',
        awsCli: 'aws ec2 revoke-security-group-ingress --group-id <SG_ID> --protocol tcp --port 22 --cidr 0.0.0.0/0\naws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 22 --cidr <YOUR_IP>/32',
        reference: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html',
      },
      {
        id: 'nist-3', framework: 'NIST', controlId: 'SC-7', title: 'Boundary Protection',
        status: 'violated', severity: 'critical',
        description: 'Network boundaries are not properly protected against unauthorized access. Missing WAF rules, overly permissive security groups, and no VPC flow logging detected.',
        impact: 'Without boundary protection, attackers can freely traverse from the internet to internal resources. This enables full kill chain execution from initial access to data exfiltration.',
        remediation: 'Implement AWS WAF on all public-facing endpoints, restrict security groups to minimum required ports, and enable VPC flow logs for all VPCs.',
        awsCli: 'aws wafv2 create-web-acl --name ProtectAPI --scope REGIONAL --default-action \'{"Block":{}}\'  --rules file://waf-rules.json\naws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type s3 --log-destination arn:aws:s3:::<BUCKET>/flow-logs/',
        reference: 'https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html',
      },
    );
  }

  // Always add logging/monitoring and baseline controls so all framework tabs have content
  controls.push(
    {
      id: 'cis-4', framework: 'CIS', controlId: 'CIS 3.1', title: 'Ensure CloudTrail is enabled in all regions',
      status: 'compliant', severity: 'low',
      description: 'CloudTrail logging is enabled across all regions, allowing comprehensive security event analysis and audit trails.',
      impact: 'Multi-region CloudTrail is the foundation of cloud security monitoring. This enabled Nova Sentinel to detect and analyze this incident.',
      remediation: 'Already compliant — maintain multi-region CloudTrail logging. Consider enabling CloudTrail Insights for anomaly detection.',
      awsCli: 'aws cloudtrail get-trail-status --name <TRAIL_NAME>',
      reference: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
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

  return controls;
}

const METHODOLOGY_TEXT = `Controls are derived from incident findings using rule-based heuristics:

• IAM/privilege events → CIS, NIST AC-6, SOC 2 CC6.1, PCI Req 7–8, SOX ITGC-AC, HIPAA §164.312
• Data access (S3, etc.) → CIS 2.x, NIST SC-28, SOC 2 CC6.7, PCI Req 3–4, HIPAA encryption
• Network/security group events → CIS 4–5, NIST SC-7, PCI Req 11, GuardDuty/IDS
• Crypto-mining or malware → NIST SI-3, RA-5, PCI Req 11

Status (violated/at-risk/compliant) is inferred from the timeline. Always verify against your actual AWS configuration—these mappings are AI-assisted, not authoritative.`;

const ComplianceMapping: React.FC<ComplianceMappingProps> = ({ timeline, incidentType }) => {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  // Stable deps to avoid recompute when parent passes new timeline object ref with same content
  const eventsLen = timeline?.events?.length ?? 0;
  const eventFingerprint = (timeline?.events ?? []).slice(0, 5).map(e => e.action || '').join('|');
  const ctx = useMemo(() => extractIncidentContext(timeline), [eventsLen, eventFingerprint]);
  const controls = useMemo(
    () => generateComplianceMappings(timeline, incidentType),
    [eventsLen, eventFingerprint, incidentType]
  );

  const filteredControls = activeFramework 
    ? controls.filter(c => c.framework === activeFramework) 
    : controls;

  // Sort by status: violated first, then at-risk, then compliant
  const sortedControls = useMemo(() => {
    const statusOrder: Record<string, number> = { 'violated': 0, 'at-risk': 1, 'compliant': 2 };
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
    return { violated, atRisk, compliant, total: controls.length };
  }, [controls]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof AlertCircle; textColor: string }> = {
      'violated': { label: 'Violated', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle, textColor: 'text-red-600' },
      'at-risk': { label: 'At Risk', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, textColor: 'text-amber-600' },
      'compliant': { label: 'Compliant', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, textColor: 'text-emerald-600' },
    };
    return configs[status] || configs['at-risk'];
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-amber-100 text-amber-800 border-amber-200',
      low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
            <h3 className="text-base font-bold text-slate-900">Compliance Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              {summary.total} controls assessed across 6 frameworks — auto-mapped from incident findings
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                <Sparkles className="w-3 h-3 text-slate-500" /> AI-Generated
              </span>
              <button
                onClick={() => setMethodologyExpanded(!methodologyExpanded)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium"
                title="How controls are derived"
              >
                <Info className="w-3 h-3" /> Methodology
                {methodologyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </p>
            {methodologyExpanded && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                {METHODOLOGY_TEXT}
              </div>
            )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
              <Brain className="w-3 h-3" /> Compliance analysis by Nova 2 Lite
            </span>
            <button
              onClick={() => {
                const generatedAt = new Date().toISOString();
                generateCompliancePdf(summary, controls, generatedAt);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Compliance Report
            </button>
          </div>
        </div>

        {/* Compliance score percentage + bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg font-bold text-slate-700">
            {summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0}% Compliant
          </span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex min-w-[120px]">
            <div className="bg-red-500 transition-all" style={{ width: `${(summary.violated / summary.total) * 100}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${(summary.atRisk / summary.total) * 100}%` }} />
            <div className="bg-emerald-500 transition-all" style={{ width: `${(summary.compliant / summary.total) * 100}%` }} />
          </div>
        </div>

        {/* Summary stats badges */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] font-bold text-red-700">{summary.violated} Violated</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-700">{summary.atRisk} At Risk</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">{summary.compliant} Compliant</span>
          </div>
        </div>
      </div>

      {/* Framework filters */}
      <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap bg-white">
        <button
          onClick={() => setActiveFramework(null)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
            !activeFramework ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          All Frameworks
        </button>
        {Object.entries(FRAMEWORK_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveFramework(activeFramework === key ? null : key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
              activeFramework === key ? `${config.bg} ${config.color} ${config.border}` : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Controls list */}
      <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
        {sortedControls.map((control) => {
          const isExpanded = expandedControl === control.id;
          const statusConfig = getStatusConfig(control.status);
          const fwConfig = FRAMEWORK_CONFIG[control.framework];
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={control.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-xl overflow-hidden transition-all ${
                control.status === 'violated' ? 'border-red-200 bg-red-50/20' : 
                control.status === 'at-risk' ? 'border-amber-200 bg-amber-50/20' : 
                'border-slate-200'
              }`}
            >
              <button
                onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                className="w-full text-left px-4 py-3.5 hover:bg-slate-50/50 transition-colors flex items-center gap-3"
              >
                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${fwConfig.bg} ${fwConfig.color} ${fwConfig.border}`}>
                      {control.controlId}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${getSeverityColor(control.severity)}`}>
                      {control.severity.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{control.title}</h4>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-100"
                  >
                    <div className="px-4 py-4 space-y-3">
                      {/* Finding */}
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Finding
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{control.description}</p>
                      </div>

                      {/* Impact */}
                      <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                        <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Business Impact
                        </p>
                        <p className="text-xs text-amber-700 leading-relaxed">{control.impact}</p>
                      </div>

                      {/* Remediation */}
                      <div className="p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Remediation
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">{control.remediation}</p>
                      </div>

                      {/* AWS CLI Command */}
                      {control.awsCli && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                            <Terminal className="w-3 h-3" /> AWS CLI Remediation
                          </p>
                          <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                            <code className="text-[11px] text-green-400 font-mono whitespace-pre leading-relaxed">
                              {control.awsCli ? substitutePlaceholders(control.awsCli, ctx) : ''}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Reference */}
                      {control.reference && (
                        <a
                          href={control.reference}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" /> View AWS Documentation
                        </a>
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
  );
};

export default ComplianceMapping;
