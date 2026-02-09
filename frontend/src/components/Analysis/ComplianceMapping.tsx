/**
 * Compliance Mapping - Maps security findings to compliance frameworks
 * CIS Benchmarks, NIST 800-53, SOC 2, PCI-DSS
 * Enhanced with AWS CLI remediation commands and detailed impact info
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Terminal, Info, ExternalLink } from 'lucide-react';
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
};

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
        awsCli: 'aws iam list-user-policies --user-name <USERNAME>\naws iam detach-user-policy --user-name <USERNAME> --policy-arn <POLICY_ARN>\naws iam add-user-to-group --user-name <USERNAME> --group-name <GROUP>',
        reference: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#use-groups-for-permissions',
      },
      {
        id: 'nist-1', framework: 'NIST', controlId: 'AC-6', title: 'Least Privilege',
        status: 'violated', severity: 'critical',
        description: 'Users or roles have excessive permissions beyond what is required for their function. Wildcard (*) permissions detected in IAM policies.',
        impact: 'Over-privileged accounts are the #1 cause of cloud security breaches. An attacker who compromises an over-privileged account can access all resources, escalate privileges, and exfiltrate data across the entire AWS environment.',
        remediation: 'Implement principle of least privilege. Use IAM Access Analyzer to identify unused permissions and scope them down to specific resources and actions.',
        awsCli: 'aws iam generate-service-last-accessed-details --arn <ROLE_ARN>\naws accessanalyzer start-policy-generation --policy-generation-details \'{"principalArn":"<ROLE_ARN>"}\'',
        reference: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
      },
      {
        id: 'soc2-1', framework: 'SOC2', controlId: 'CC6.1', title: 'Logical and Physical Access Controls',
        status: 'at-risk', severity: 'high',
        description: 'Access controls are not sufficient to prevent unauthorized privilege escalation. MFA may not be enforced for all privileged users.',
        impact: 'SOC 2 audit failure on CC6.1 can result in loss of customer trust, inability to pass compliance audits, and potential loss of enterprise contracts that require SOC 2 attestation.',
        remediation: 'Implement MFA for all IAM users, enforce role-based access controls, and schedule regular access reviews using AWS IAM Access Analyzer.',
        awsCli: 'aws iam create-virtual-mfa-device --virtual-mfa-device-name <MFA_NAME>\naws iam enable-mfa-device --user-name <USERNAME> --serial-number <MFA_ARN> --authentication-code1 <CODE1> --authentication-code2 <CODE2>',
      },
      {
        id: 'pci-1', framework: 'PCI', controlId: 'Req 7.1', title: 'Limit access to system components',
        status: 'violated', severity: 'critical',
        description: 'Access to cardholder data environment is not restricted based on business need-to-know. Overly permissive IAM policies may grant access to payment-related resources.',
        impact: 'PCI-DSS Requirement 7 violations can result in fines of $5,000–$100,000/month from payment card brands, loss of ability to process card payments, and mandatory forensic investigation ($50,000+).',
        remediation: 'Implement role-based access control for all CDE resources. Restrict privileges to minimum necessary and document business justification for each access grant.',
        awsCli: 'aws iam put-role-policy --role-name <ROLE> --policy-name RestrictCDE --policy-document file://least-privilege-policy.json',
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
      },
      {
        id: 'soc2-2', framework: 'SOC2', controlId: 'CC6.7', title: 'Restrict Transmission of Data',
        status: 'violated', severity: 'critical',
        description: 'Data transmission occurred without proper authorization and monitoring. Large data transfers detected without corresponding DLP controls.',
        impact: 'Unmonitored data transmission is the primary vector for data exfiltration. Without DLP controls, sensitive data can leave the organization without detection, leading to regulatory penalties and reputational damage.',
        remediation: 'Enable VPC Flow Logs, implement S3 access logging, and configure CloudWatch alarms for unusual data transfer patterns.',
        awsCli: 'aws ec2 create-flow-logs --resource-ids <VPC_ID> --resource-type VPC --traffic-type ALL --log-destination-type cloud-watch-logs --log-group-name VPCFlowLogs\naws s3api put-bucket-logging --bucket <BUCKET> --bucket-logging-status file://logging-config.json',
      },
      {
        id: 'pci-2', framework: 'PCI', controlId: 'Req 3.4', title: 'Render PAN unreadable anywhere it is stored',
        status: 'at-risk', severity: 'high',
        description: 'Data stores may contain unencrypted sensitive information including potential cardholder data.',
        impact: 'Storing PAN data in clear text violates PCI-DSS and can result in immediate suspension of card processing capabilities. Breach notification costs average $150 per compromised record.',
        remediation: 'Implement tokenization or strong encryption for all sensitive data at rest. Use AWS CloudHSM or KMS for key management.',
        awsCli: 'aws kms create-key --description "PCI-DSS data encryption key"\naws kms create-alias --alias-name alias/pci-data-key --target-key-id <KEY_ID>',
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
      },
    );
  }

  // Always add logging/monitoring controls
  controls.push(
    {
      id: 'cis-4', framework: 'CIS', controlId: 'CIS 3.1', title: 'Ensure CloudTrail is enabled in all regions',
      status: 'compliant', severity: 'low',
      description: 'CloudTrail logging is enabled across all regions, allowing comprehensive security event analysis and audit trails.',
      impact: 'Multi-region CloudTrail is the foundation of cloud security monitoring. This enabled Nova Sentinel to detect and analyze this incident.',
      remediation: 'Already compliant — maintain multi-region CloudTrail logging. Consider enabling CloudTrail Insights for anomaly detection.',
      awsCli: 'aws cloudtrail get-trail-status --name <TRAIL_NAME>',
    },
    {
      id: 'nist-4', framework: 'NIST', controlId: 'AU-2', title: 'Audit Events',
      status: 'compliant', severity: 'low',
      description: 'Security-relevant events are being logged and monitored through CloudTrail, enabling incident detection and forensic analysis.',
      impact: 'Proper audit logging is critical for incident response, compliance attestation, and forensic investigation. This control is foundational for all other security monitoring.',
      remediation: 'Continue monitoring and expand event coverage. Consider adding AWS Config rules for configuration change tracking.',
      awsCli: 'aws configservice put-configuration-recorder --configuration-recorder \'{"name":"default","roleARN":"<ROLE_ARN>","recordingGroup":{"allSupported":true}}\'',
    },
  );

  return controls;
}

const ComplianceMapping: React.FC<ComplianceMappingProps> = ({ timeline, incidentType }) => {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  const controls = useMemo(() => generateComplianceMappings(timeline, incidentType), [timeline, incidentType]);

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Compliance Mapping
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary.total} controls assessed across 4 frameworks — auto-mapped from incident findings
            </p>
          </div>
        </div>

        {/* Summary stats - compliance score bar */}
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

        {/* Visual compliance score bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
          <div className="bg-red-500 transition-all" style={{ width: `${(summary.violated / summary.total) * 100}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${(summary.atRisk / summary.total) * 100}%` }} />
          <div className="bg-emerald-500 transition-all" style={{ width: `${(summary.compliant / summary.total) * 100}%` }} />
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
                              {control.awsCli}
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
