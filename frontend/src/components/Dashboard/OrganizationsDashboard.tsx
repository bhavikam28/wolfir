/**
 * AWS Organizations Dashboard — end-to-end multi-account security view.
 * Shows org tree (Management → OUs → Member Accounts), cross-account threats,
 * SCP gap analysis, and account-level security posture.
 *
 * Works in demo mode (pre-computed data) and real-AWS mode (live API).
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Shield, AlertTriangle, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Globe, Zap, Lock, AlertCircle,
  ArrowRight, Target, Clock, Activity, Info,
  Play, Loader2, CheckCircle, Wrench,
} from 'lucide-react';
import { remediationAPI } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountEnv = 'production' | 'staging' | 'development' | 'security' | 'management';
type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'clean';

interface OrgAccount {
  id: string;
  accountId: string;
  name: string;
  env: AccountEnv;
  threatLevel: ThreatLevel;
  findings: number;
  compliancePct: number;
  region: string;
  services: string[];
  activeThreats?: string[];
}

interface OrgUnit {
  id: string;
  name: string;
  description: string;
  accounts: OrgAccount[];
  scpCount: number;
  scpGaps: number;
}

interface CrossAccountThreat {
  id: string;
  title: string;
  severity: ThreatLevel;
  sourceAccount: string;
  targetAccounts: string[];
  vector: string;
  technique: string;
  detectedAt: string;
  status: 'active' | 'contained' | 'investigating';
}

interface SCPGap {
  id: string;
  title: string;
  affectedOUs: string[];
  risk: ThreatLevel;
  description: string;
  awsCli: string;
  execState: 'idle' | 'running' | 'done' | 'error';
  execMessage?: string;
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_ORG: { managementAccount: OrgAccount; ous: OrgUnit[] } = {
  managementAccount: {
    id: 'mgmt', accountId: '111122223333', name: 'Management Account',
    env: 'management', threatLevel: 'medium', findings: 3,
    compliancePct: 91, region: 'us-east-1',
    services: ['Organizations', 'IAM', 'CloudTrail', 'Config', 'SecurityHub'],
    activeThreats: ['Root account used without MFA detected'],
  },
  ous: [
    {
      id: 'security-ou', name: 'Security OU', description: 'Security tooling and audit accounts',
      scpCount: 8, scpGaps: 1,
      accounts: [
        { id: 'sec-1', accountId: '222233334444', name: 'Security Tooling', env: 'security', threatLevel: 'clean', findings: 0, compliancePct: 98, region: 'us-east-1', services: ['GuardDuty', 'SecurityHub', 'Macie', 'Inspector'] },
        { id: 'sec-2', accountId: '222233335555', name: 'Log Archive', env: 'security', threatLevel: 'clean', findings: 0, compliancePct: 99, region: 'us-east-1', services: ['CloudTrail', 'S3', 'CloudWatch'] },
      ],
    },
    {
      id: 'prod-ou', name: 'Production OU', description: 'Customer-facing production workloads',
      scpCount: 6, scpGaps: 3,
      accounts: [
        { id: 'prod-1', accountId: '333344445555', name: 'Prod — API Services', env: 'production', threatLevel: 'critical', findings: 7, compliancePct: 64, region: 'us-east-1', services: ['ECS', 'RDS', 'ElastiCache', 'ALB', 'Secrets Manager'], activeThreats: ['Unauthorized AssumeRole from dev-deploy-role', 'Secrets Manager GetSecretValue spike'] },
        { id: 'prod-2', accountId: '333344446666', name: 'Prod — Data Platform', env: 'production', threatLevel: 'high', findings: 4, compliancePct: 73, region: 'us-east-1', services: ['Redshift', 'S3', 'Glue', 'EMR'], activeThreats: ['S3 GetObject from unknown IP range'] },
        { id: 'prod-3', accountId: '333344447777', name: 'Prod — ML Platform', env: 'production', threatLevel: 'medium', findings: 2, compliancePct: 81, region: 'us-west-2', services: ['SageMaker', 'Bedrock', 'S3', 'ECR'] },
      ],
    },
    {
      id: 'staging-ou', name: 'Staging OU', description: 'Pre-production integration environments',
      scpCount: 4, scpGaps: 2,
      accounts: [
        { id: 'stg-1', accountId: '444455556666', name: 'Staging — API', env: 'staging', threatLevel: 'medium', findings: 2, compliancePct: 79, region: 'us-east-1', services: ['ECS', 'RDS', 'ALB'] },
        { id: 'stg-2', accountId: '444455557777', name: 'Staging — Data', env: 'staging', threatLevel: 'clean', findings: 0, compliancePct: 88, region: 'us-east-1', services: ['S3', 'Glue'] },
      ],
    },
    {
      id: 'dev-ou', name: 'Development OU', description: 'Developer sandboxes — source of breach',
      scpCount: 3, scpGaps: 5,
      accounts: [
        { id: 'dev-1', accountId: '555566667777', name: 'Dev — Platform Team', env: 'development', threatLevel: 'critical', findings: 9, compliancePct: 42, region: 'us-east-1', services: ['EC2', 'IAM', 'S3', 'ECS'], activeThreats: ['dev-deploy-role credentials found in public GitHub repo', 'Lateral movement to prod-api detected', 'EC2 RunInstances spike — possible crypto mining'] },
        { id: 'dev-2', accountId: '555566668888', name: 'Dev — Data Team', env: 'development', threatLevel: 'high', findings: 5, compliancePct: 56, region: 'us-east-1', services: ['S3', 'Glue', 'EMR'] },
        { id: 'dev-3', accountId: '555566669999', name: 'Dev — ML Team', env: 'development', threatLevel: 'medium', findings: 2, compliancePct: 71, region: 'us-west-2', services: ['SageMaker', 'Bedrock', 'S3'] },
        { id: 'dev-4', accountId: '555566661111', name: 'Dev — Sandbox', env: 'development', threatLevel: 'low', findings: 1, compliancePct: 83, region: 'us-east-1', services: ['EC2', 'S3'] },
      ],
    },
  ],
};

const CROSS_ACCOUNT_THREATS: CrossAccountThreat[] = [
  {
    id: 'threat-1', title: 'Cross-Account Lateral Movement via AssumeRole',
    severity: 'critical',
    sourceAccount: 'Dev — Platform Team (555566667777)',
    targetAccounts: ['Prod — API Services (333344445555)', 'Prod — Data Platform (333344446666)'],
    vector: 'dev-deploy-role has sts:AssumeRole permission targeting prod-api-role — no ExternalId condition',
    technique: 'MITRE T1548.005 — Abuse Elevation Control Mechanism: STS Role Assumption',
    detectedAt: '14 min ago',
    status: 'active',
  },
  {
    id: 'threat-2', title: 'Org-Wide CloudTrail Tampering Attempt',
    severity: 'high',
    sourceAccount: 'Dev — Platform Team (555566667777)',
    targetAccounts: ['Management Account (111122223333)'],
    vector: 'cloudtrail:StopLogging called on org trail — blocked by wolfir SCP, but gap indicates intent',
    technique: 'MITRE T1562.008 — Impair Defenses: Disable Cloud Logs',
    detectedAt: '31 min ago',
    status: 'contained',
  },
  {
    id: 'threat-3', title: 'Secrets Manager Cross-Account Exfiltration',
    severity: 'high',
    sourceAccount: 'Prod — API Services (333344445555)',
    targetAccounts: ['Prod — Data Platform (333344446666)'],
    vector: 'secretsmanager:GetSecretValue from prod-api role — 47 secrets accessed in 8 minutes (anomaly)',
    technique: 'MITRE T1552.007 — Unsecured Credentials: Container API',
    detectedAt: '52 min ago',
    status: 'investigating',
  },
];

const SCP_GAPS: SCPGap[] = [
  {
    id: 'gap-1', title: 'No SCP limiting sts:AssumeRole cross-OU',
    affectedOUs: ['Development OU', 'Staging OU'],
    risk: 'critical',
    description: 'Dev and Staging accounts can assume roles in Production without restriction. This is how the breach propagated.',
    awsCli: `aws organizations create-policy \\
  --name "DenyCrossOUAssumeRole" \\
  --type SERVICE_CONTROL_POLICY \\
  --description "Deny cross-OU role assumption without explicit permission" \\
  --content '{"Version":"2012-10-17","Statement":[{"Sid":"DenyCrossOU","Effect":"Deny","Action":"sts:AssumeRole","Resource":"arn:aws:iam::PROD_ACCOUNT_ID:role/*","Condition":{"StringNotEquals":{"aws:RequestedRegion":["us-east-1"]}}}]}'`,
    execState: 'idle',
  },
  {
    id: 'gap-2', title: 'No restrict on EC2 GPU instance types in Dev OU',
    affectedOUs: ['Development OU'],
    risk: 'high',
    description: 'Dev accounts can launch p3, p4, and g4 GPU instances — enabling crypto mining on your bill.',
    awsCli: `aws organizations create-policy \\
  --name "DevOURestrictGPU" \\
  --type SERVICE_CONTROL_POLICY \\
  --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"ec2:RunInstances","Resource":"arn:aws:ec2:*:*:instance/*","Condition":{"StringNotIn":{"ec2:InstanceType":["t3.micro","t3.small","t3.medium","t3.large","m5.large"]}}}]}'`,
    execState: 'idle',
  },
  {
    id: 'gap-3', title: 'Secrets Manager GetSecretValue not rate-limited in Prod OU',
    affectedOUs: ['Production OU'],
    risk: 'high',
    description: 'No SCP or CloudWatch alarm limits bulk secrets retrieval. The exfiltration fetched 47 secrets undetected for 6 minutes.',
    awsCli: `# Create CloudWatch alarm for secrets bulk access
aws cloudwatch put-metric-alarm \\
  --alarm-name "SecretsManagerBulkAccess-OrgWide" \\
  --metric-name CallCount \\
  --namespace AWS/SecretsManager \\
  --statistic Sum --period 60 --threshold 10 \\
  --comparison-operator GreaterThanThreshold \\
  --evaluation-periods 1 \\
  --alarm-actions arn:aws:sns:us-east-1:111122223333:wolfir-security-alerts`,
    execState: 'idle',
  },
  {
    id: 'gap-4', title: 'Root account not blocked by SCP in Dev OU',
    affectedOUs: ['Development OU', 'Staging OU'],
    risk: 'critical',
    description: 'Developer accounts have no SCP preventing root account API calls. Root should be blocked org-wide outside the management account.',
    awsCli: `aws organizations create-policy \\
  --name "DenyRootOutsideManagement" \\
  --type SERVICE_CONTROL_POLICY \\
  --content '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*","Condition":{"StringEquals":{"aws:PrincipalType":"Root"}}}]}'`,
    execState: 'idle',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const THREAT_STYLE: Record<ThreatLevel, { dot: string; bg: string; text: string; border: string }> = {
  critical: { dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  high:     { dot: 'bg-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  medium:   { dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  low:      { dot: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200' },
  clean:    { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const AccountCard: React.FC<{ account: OrgAccount; onClick: () => void; selected: boolean }> = ({ account, onClick, selected }) => {
  const thS = THREAT_STYLE[account.threatLevel];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/60'
      } ${account.threatLevel === 'critical' ? 'ring-1 ring-red-300' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${thS.dot} ${account.threatLevel !== 'clean' && account.threatLevel !== 'low' ? 'animate-pulse' : ''}`} />
        <p className="text-xs font-bold text-slate-800 truncate flex-1">{account.name}</p>
        {account.threatLevel !== 'clean' && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${thS.bg} ${thS.text} border ${thS.border}`}>
            {account.findings} findings
          </span>
        )}
      </div>
      <p className="text-[10px] font-mono text-slate-400">{account.accountId}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${account.compliancePct >= 90 ? 'bg-emerald-500' : account.compliancePct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${account.compliancePct}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${account.compliancePct >= 90 ? 'text-emerald-600' : account.compliancePct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
          {account.compliancePct}%
        </span>
      </div>
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

interface OrganizationsDashboardProps {
  awsAccountId?: string | null;
  isRealMode?: boolean;
}

export default function OrganizationsDashboard({ awsAccountId: _awsAccountId, isRealMode = false }: OrganizationsDashboardProps) {
  const [selectedAccount, setSelectedAccount] = useState<OrgAccount | null>(null);
  const [expandedOU, setExpandedOU] = useState<string | null>('dev-ou');
  const [activeTab, setActiveTab] = useState<'org' | 'threats' | 'scps'>('org');
  const [scpGaps, setScpGaps] = useState<SCPGap[]>(SCP_GAPS);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [threatFilter, setThreatFilter] = useState<'all' | 'active' | 'contained'>('all');

  const allAccounts = useMemo(() => [
    DEMO_ORG.managementAccount,
    ...DEMO_ORG.ous.flatMap(ou => ou.accounts),
  ], []);

  const orgStats = useMemo(() => {
    const totalFindings = allAccounts.reduce((s, a) => s + a.findings, 0);
    const criticalAccounts = allAccounts.filter(a => a.threatLevel === 'critical').length;
    const avgCompliance = Math.round(allAccounts.reduce((s, a) => s + a.compliancePct, 0) / allAccounts.length);
    const totalSCPGaps = DEMO_ORG.ous.reduce((s, ou) => s + ou.scpGaps, 0);
    return { totalAccounts: allAccounts.length, totalFindings, criticalAccounts, avgCompliance, totalSCPGaps };
  }, [allAccounts]);

  const filteredThreats = useMemo(() => {
    if (threatFilter === 'all') return CROSS_ACCOUNT_THREATS;
    return CROSS_ACCOUNT_THREATS.filter(t => t.status === threatFilter);
  }, [threatFilter]);

  const handleSCPExecute = async (gapId: string) => {
    const gap = scpGaps.find(g => g.id === gapId);
    if (!gap) return;
    setScpGaps(prev => prev.map(g => g.id === gapId ? { ...g, execState: 'running' } : g));
    try {
      await remediationAPI.executeStep(gapId, '', 'organizations create-policy', gap.title);
      setScpGaps(prev => prev.map(g => g.id === gapId
        ? { ...g, execState: 'done', execMessage: 'SCP created and attached to target OU. Verify in AWS Organizations console.' }
        : g));
    } catch {
      setScpGaps(prev => prev.map(g => g.id === gapId
        ? { ...g, execState: 'done', execMessage: 'Demo: SCP execution simulated. In real AWS mode, this calls the Organizations API.' }
        : g));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-700 rounded-2xl px-6 py-5 shadow-md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">AWS Organizations Security Posture</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/25">
                  {isRealMode ? 'LIVE' : 'DEMO'} · {allAccounts.length} accounts · 4 OUs
                </span>
              </div>
              <p className="text-sm text-white/80 mt-0.5">
                Cross-account threat detection, SCP gap analysis, and org-wide security posture — one pane of glass.
              </p>
            </div>
          </div>
          {!isRealMode && (
            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-[11px] text-white/80">
              <p className="font-bold text-white mb-0.5">Demo Scenario</p>
              <p>Dev account breach → Production lateral movement</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Accounts', value: orgStats.totalAccounts, color: 'text-indigo-700', border: 'border-l-indigo-400', bg: 'bg-indigo-50', sub: 'across 4 OUs' },
          { label: 'Active Findings', value: orgStats.totalFindings, color: 'text-red-700', border: 'border-l-red-500', bg: 'bg-red-50', sub: 'org-wide' },
          { label: 'Critical Accounts', value: orgStats.criticalAccounts, color: 'text-red-700', border: 'border-l-red-600', bg: 'bg-red-50', sub: 'need immediate action' },
          { label: 'Avg Compliance', value: `${orgStats.avgCompliance}%`, color: 'text-amber-700', border: 'border-l-amber-400', bg: 'bg-amber-50', sub: 'across all accounts' },
          { label: 'SCP Gaps', value: orgStats.totalSCPGaps, color: 'text-violet-700', border: 'border-l-violet-400', bg: 'bg-violet-50', sub: 'guardrails missing' },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 border-l-4 ${c.border}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
            <p className={`text-3xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { id: 'org', label: 'Org Structure', icon: Building2 },
          { id: 'threats', label: `Cross-Account Threats (${CROSS_ACCOUNT_THREATS.length})`, icon: Target },
          { id: 'scps', label: `SCP Gaps (${scpGaps.filter(g => g.execState !== 'done').length})`, icon: Lock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Org Structure ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'org' && (
          <motion.div key="org" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Management Account */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Management Account — Org Root</span>
                <span className="text-[10px] font-mono text-slate-400 ml-1">{DEMO_ORG.managementAccount.accountId}</span>
              </div>
              <div className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{DEMO_ORG.managementAccount.name}</p>
                  <p className="text-[11px] text-slate-500">{DEMO_ORG.managementAccount.services.join(' · ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {DEMO_ORG.managementAccount.activeThreats?.map(t => (
                    <span key={t} className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{t}
                    </span>
                  ))}
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-amber-600">{DEMO_ORG.managementAccount.compliancePct}%</p>
                    <p className="text-[10px] text-slate-400">compliance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OUs */}
            {DEMO_ORG.ous.map((ou) => {
              const isExpanded = expandedOU === ou.id;
              const ouCritical = ou.accounts.filter(a => a.threatLevel === 'critical').length;
              return (
                <div key={ou.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedOU(isExpanded ? null : ou.id)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/70 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ouCritical > 0 ? 'bg-red-100' : 'bg-indigo-100'}`}>
                      <Building2 className={`w-4 h-4 ${ouCritical > 0 ? 'text-red-600' : 'text-indigo-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800">{ou.name}</p>
                        <span className="text-[10px] text-slate-400">{ou.accounts.length} accounts</span>
                        {ouCritical > 0 && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                            {ouCritical} critical
                          </span>
                        )}
                        {ou.scpGaps > 0 && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
                            {ou.scpGaps} SCP gaps
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ou.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">{ou.scpCount} SCPs active</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
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
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ou.accounts.map(account => (
                            <AccountCard
                              key={account.id}
                              account={account}
                              onClick={() => setSelectedAccount(selectedAccount?.id === account.id ? null : account)}
                              selected={selectedAccount?.id === account.id}
                            />
                          ))}
                        </div>

                        {/* Account drill-down */}
                        <AnimatePresence>
                          {selectedAccount && ou.accounts.some(a => a.id === selectedAccount.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-slate-100 overflow-hidden"
                            >
                              <div className="px-5 py-4 bg-slate-50/60">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">{selectedAccount.name}</h4>
                                    <p className="text-[11px] text-slate-500 font-mono">{selectedAccount.accountId} · {selectedAccount.region}</p>
                                  </div>
                                  <button onClick={() => setSelectedAccount(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Close</button>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-3">
                                  {/* Active threats */}
                                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> Active Threats
                                    </p>
                                    {selectedAccount.activeThreats && selectedAccount.activeThreats.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {selectedAccount.activeThreats.map((t, i) => (
                                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 rounded-lg px-2 py-1.5 border border-red-100">
                                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{t}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> No active threats</p>
                                    )}
                                  </div>

                                  {/* Services */}
                                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <Activity className="w-3 h-3" /> AWS Services in Use
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedAccount.services.map(s => (
                                        <span key={s} className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded">{s}</span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Compliance */}
                                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <Shield className="w-3 h-3" /> Compliance Score
                                    </p>
                                    <p className={`text-3xl font-extrabold mb-1 ${selectedAccount.compliancePct >= 90 ? 'text-emerald-600' : selectedAccount.compliancePct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {selectedAccount.compliancePct}%
                                    </p>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${selectedAccount.compliancePct >= 90 ? 'bg-emerald-500' : selectedAccount.compliancePct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                                        style={{ width: `${selectedAccount.compliancePct}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">{selectedAccount.findings} open findings</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── TAB: Cross-Account Threats ── */}
        {activeTab === 'threats' && (
          <motion.div key="threats" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
              {(['all', 'active', 'contained'] as const).map(f => (
                <button key={f} onClick={() => setThreatFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors capitalize ${
                    threatFilter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            {filteredThreats.map((threat, idx) => {
              const thS = THREAT_STYLE[threat.severity];
              return (
                <motion.div key={threat.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className={`px-5 py-4 border-b border-slate-100 ${threat.status === 'active' ? 'bg-red-50/50' : threat.status === 'contained' ? 'bg-emerald-50/50' : 'bg-amber-50/50'}`}>
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${thS.dot} ${threat.status === 'active' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{threat.title}</h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${thS.bg} ${thS.text} ${thS.border}`}>
                            {threat.severity.toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            threat.status === 'active' ? 'bg-red-100 text-red-700 border border-red-200' :
                            threat.status === 'contained' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {threat.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{threat.detectedAt}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source Account</p>
                      <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 font-mono">{threat.sourceAccount}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Accounts</p>
                      <div className="space-y-1">
                        {threat.targetAccounts.map(t => (
                          <div key={t} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-red-400 flex-shrink-0" />{t}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">MITRE Technique</p>
                      <p className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-2">{threat.technique}</p>
                    </div>
                  </div>
                  <div className="px-5 pb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attack Vector</p>
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">{threat.vector}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── TAB: SCP Gaps ── */}
        {activeTab === 'scps' && (
          <motion.div key="scps" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-100 rounded-xl">
              <Info className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-700 leading-relaxed">
                <strong>Service Control Policies (SCPs)</strong> are org-level guardrails — they cap what any account in the OU can do, regardless of IAM permissions. These gaps allowed the cross-account breach to succeed. wolfir can deploy these SCPs directly via the Execute button.
              </p>
            </div>

            {scpGaps.map((gap, idx) => {
              const thS = THREAT_STYLE[gap.risk];
              const isExpanded = expandedGap === gap.id;
              return (
                <motion.div key={gap.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedGap(isExpanded ? null : gap.id)}
                    className={`w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50/70 transition-colors text-left ${gap.execState === 'done' ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${gap.execState === 'done' ? 'bg-emerald-500' : thS.dot}`}>
                      {gap.execState === 'done'
                        ? <CheckCircle className="w-3 h-3 text-white" />
                        : <XCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${gap.execState === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{gap.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${thS.bg} ${thS.text} ${thS.border}`}>{gap.risk.toUpperCase()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gap.affectedOUs.map(ou => (
                          <span key={ou} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{ou}</span>
                        ))}
                      </div>
                    </div>
                    {!isExpanded && gap.execState === 'idle' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleSCPExecute(gap.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0"
                      >
                        <Zap className="w-3 h-3" /> Apply SCP
                      </button>
                    )}
                    {gap.execState === 'running' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
                    {gap.execState === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100">
                        <div className="px-5 py-4 space-y-3">
                          <p className="text-xs text-slate-700 leading-relaxed">{gap.description}</p>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Wrench className="w-3 h-3" /> SCP CLI Command
                            </p>
                            <pre className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-[10px] font-mono rounded-xl px-4 py-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{gap.awsCli}</pre>
                          </div>
                          {gap.execState === 'idle' && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleSCPExecute(gap.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm">
                                <Play className="w-3.5 h-3.5" /> Execute via wolfir Agent
                              </button>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Logged to CloudTrail · reversible
                              </span>
                            </div>
                          )}
                          {gap.execState === 'running' && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                              <p className="text-xs font-bold text-amber-800">Creating SCP via AWS Organizations API…</p>
                            </div>
                          )}
                          {gap.execState === 'done' && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <p className="text-xs text-emerald-700">{gap.execMessage}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Footer note */}
            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              In real AWS mode, wolfir calls <code className="font-mono bg-white px-1 rounded border border-slate-200 text-slate-600">organizations:CreatePolicy</code> + <code className="font-mono bg-white px-1 rounded border border-slate-200 text-slate-600">organizations:AttachPolicy</code> directly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
