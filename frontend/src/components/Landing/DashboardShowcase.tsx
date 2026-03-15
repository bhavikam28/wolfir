/**
 * DashboardShowcase — Interactive product preview section
 * Each tab renders a unique inline UI mockup of a different wolfir dashboard view.
 * No AI-generated images — real wolfir UI patterns, no watermarks, fully premium.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, AlertTriangle, FileText, Eye, ChevronRight,
  CheckCircle, AlertCircle, Server, Globe,
  Lock, TrendingUp, Radio,
} from 'lucide-react';

/* ─────────────────────────── Tab definitions ─────────────────────────── */
const TABS = [
  {
    id: 'incident',
    label: 'Incident Response',
    icon: AlertTriangle,
    title: 'Full 5-Agent Incident Pipeline',
    desc: 'From raw CloudTrail events to a complete investigation, attack path, and remediation plan — automatically. Timeline correlation, root cause analysis, severity scoring, and actionable CLI commands in one flow.',
    accent: '#2563EB',
    pills: ['CloudTrail Analysis', '12 Regions', '90d Lookback', 'Kill Chain', 'MITRE ATT&CK'],
  },
  {
    id: 'pipeline',
    label: 'Pipeline Stages',
    icon: Activity,
    title: 'Agent Specialization at Every Stage',
    desc: 'Each of the 5 agents uses a different Nova model matched to the task. Nova Micro for classification, Nova Pro for attack path reasoning, Nova 2 Lite for documentation. Model specialization, not one-size-fits-all.',
    accent: '#6366F1',
    pills: ['Nova Pro', 'Nova 2 Lite', 'Nova Micro', 'Nova 2 Sonic', 'Nova Act'],
  },
  {
    id: 'ai-security',
    label: 'AI Security',
    icon: Shield,
    title: 'wolfir Monitors Its Own AI Pipeline',
    desc: 'MITRE ATLAS + OWASP LLM Top 10 applied to our own reasoning layer. Six techniques monitored in real time: prompt injection, capability theft, API abuse, adversarial inputs, data exfiltration, and model poisoning.',
    accent: '#DC2626',
    pills: ['MITRE ATLAS', 'OWASP LLM Top 10', 'Bedrock Guardrails', 'Self-Monitoring'],
  },
  {
    id: 'posture',
    label: 'Security Posture',
    icon: Eye,
    title: 'Real-Time Security Posture Dashboard',
    desc: 'Continuous visibility across your AWS environment — IAM anomalies, CloudTrail patterns, Security Hub findings, and AI pipeline health. Signal-to-noise separation with context, not just alerts.',
    accent: '#7C3AED',
    pills: ['IAM Audit', 'Security Hub', 'Anomaly Detection', 'Real-Time'],
  },
  {
    id: 'cloud',
    label: 'Cloud Security',
    icon: FileText,
    title: 'Cloud Security Across 12 AWS Regions',
    desc: 'CloudTrail analysis from all 12 major AWS regions with 90-day lookback. Kill chain tracing across accounts and services. Cross-incident memory so wolfir knows if it has seen an attacker before.',
    accent: '#0EA5E9',
    pills: ['CloudTrail', 'Multi-Region', 'Demo Mode', 'Live AWS', 'DynamoDB Memory'],
  },
];

/* ─────────────────────── Sidebar (shared shell) ─────────────────────── */
const Sidebar: React.FC<{ active: string; accent: string }> = ({ active, accent }) => {
  const items = [
    { label: 'Security Overview', id: 'incident' },
    { label: 'Incident Timeline', id: 'timeline' },
    { label: 'Attack Path', id: 'path' },
    { label: 'Autonomous Agent', id: 'agent', badge: 'NEW' },
    { label: 'Compliance Mapping', id: 'posture' },
    { label: 'Remediation Engine', id: 'cloud' },
    { label: 'AI Security', id: 'ai-security' },
    { label: 'Pipeline Stages', id: 'pipeline' },
  ];
  return (
    <div className="w-48 shrink-0 bg-slate-900 border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: accent }}>
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">wolfir</span>
        </div>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${accent}25`, color: accent }}>DEMO MODE</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5 mt-1">Analysis</p>
        {items.slice(0, 4).map(item => (
          <div key={item.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-default"
            style={item.id === active
              ? { background: `${accent}20`, color: accent, fontWeight: 600 }
              : { color: '#94a3b8' }
            }
          >
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${accent}30`, color: accent }}>NEW</span>
            )}
          </div>
        ))}
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5 mt-2.5">Intelligence</p>
        {items.slice(4).map(item => (
          <div key={item.id}
            className="flex items-center px-2 py-1.5 rounded-md text-xs cursor-default"
            style={item.id === active
              ? { background: `${accent}20`, color: accent, fontWeight: 600 }
              : { color: '#94a3b8' }
            }
          >
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

/* ─────────────────── Tab 1: Incident Response ───────────────────────── */
const IncidentResponseView: React.FC = () => (
  <div className="flex-1 bg-white overflow-hidden">
    <div className="px-5 pt-4 pb-3 border-b border-slate-100">
      <h2 className="text-sm font-bold text-slate-800">Security Overview</h2>
      <p className="text-xs text-slate-400 mt-0.5">Demo Mode · Live AWS Analysis</p>
    </div>
    <div className="p-4 space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'ROOT CAUSE', value: 'IAM role compromise', mono: false },
          { label: 'BLAST RADIUS', value: '3 resources', mono: false },
          { label: 'CONFIDENCE', value: '92%', mono: false },
        ].map(c => (
          <div key={c.label} className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/60">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-xs font-bold text-slate-800 leading-tight">{c.value}</p>
          </div>
        ))}
      </div>
      {/* Timeline */}
      <div className="border border-slate-100 rounded-lg p-3">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Incident Timeline</p>
        {[
          { event: 'ConsoleLogin (root)', time: '2m ago', color: '#DC2626' },
          { event: 'CreateAccessKey', time: '2m ago', color: '#D97706' },
          { event: 'AuthorizeSecurityGroupIngress', time: '1m ago', color: '#DC2626' },
          { event: 'PutRolePolicy (PrivEsc)', time: '45s ago', color: '#DC2626' },
          { event: 'GetSecretValue · S3:GetObject', time: '30s ago', color: '#D97706' },
        ].map((e, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
              <span className="text-xs text-slate-700 font-medium">{e.event}</span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 ml-2">{e.time}</span>
          </div>
        ))}
      </div>
      {/* Severity */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">CRITICAL</span>
        <span className="text-xs text-slate-500">Kill chain: CredentialAccess → PrivilegeEscalation → Exfiltration</span>
      </div>
    </div>
  </div>
);

/* ─────────────────── Tab 2: Pipeline Stages ─────────────────────────── */
const PipelineView: React.FC = () => {
  const agents = [
    { name: 'Temporal Agent', model: 'Nova 2 Lite', status: 'done', time: '1.2s', desc: 'Correlates 847 events, 5 anomalies' },
    { name: 'Investigation Agent', model: 'Nova Pro', status: 'done', time: '4.1s', desc: 'Attack path: 6 nodes, MITRE T1078' },
    { name: 'Risk Scorer', model: 'Nova Micro', status: 'active', time: '0.3s', desc: 'Scoring blast radius...' },
    { name: 'Remediation Agent', model: 'Nova Pro', status: 'pending', time: '—', desc: 'Waiting for risk score' },
    { name: 'Documentation Agent', model: 'Nova 2 Lite', status: 'pending', time: '—', desc: 'Report generation queued' },
  ];
  const statusColor: Record<string, string> = { done: '#10B981', active: '#2563EB', pending: '#94a3b8' };
  const statusLabel: Record<string, string> = { done: 'Done', active: 'Running', pending: 'Queued' };
  return (
    <div className="flex-1 bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">Agent Pipeline</h2>
        <p className="text-xs text-slate-400 mt-0.5">5 Specialized Agents · Amazon Nova Suite</p>
      </div>
      <div className="p-4 space-y-2">
        {agents.map((a, i) => (
          <div key={i} className={`rounded-lg border p-3 flex items-start gap-3 ${a.status === 'active' ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
            {/* Step circle */}
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
              style={{ background: statusColor[a.status] }}>
              {a.status === 'done' ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">{a.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${statusColor[a.status]}18`, color: statusColor[a.status] }}>
                  {statusLabel[a.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{a.model}</span>
                <span className="text-[10px] text-slate-400">{a.desc}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono shrink-0 mt-1">{a.time}</span>
          </div>
        ))}
        {/* MCP indicator */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-slate-400">3 MCP servers connected · CloudTrail · IAM · SecurityHub</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── Tab 3: AI Security ────────────────────────────── */
const AISecurityView: React.FC = () => {
  const techniques = [
    { id: 'AML.T0051', name: 'Prompt Injection', severity: 'HIGH', status: 'Monitored', category: 'MITRE ATLAS' },
    { id: 'AML.T0048', name: 'Model Capability Theft', severity: 'MED', status: 'Monitored', category: 'MITRE ATLAS' },
    { id: 'LLM01', name: 'Prompt Injection (OWASP)', severity: 'HIGH', status: 'Guarded', category: 'OWASP LLM' },
    { id: 'LLM06', name: 'Sensitive Info Disclosure', severity: 'HIGH', status: 'Guarded', category: 'OWASP LLM' },
    { id: 'AML.T0040', name: 'Adversarial Input', severity: 'MED', status: 'Monitored', category: 'MITRE ATLAS' },
    { id: 'LLM02', name: 'Insecure Output Handling', severity: 'MED', status: 'Guarded', category: 'OWASP LLM' },
  ];
  const sevColor: Record<string, string> = { HIGH: '#DC2626', MED: '#D97706', LOW: '#16a34a' };
  return (
    <div className="flex-1 bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">AI Pipeline Security</h2>
          <p className="text-xs text-slate-400 mt-0.5">MITRE ATLAS · OWASP LLM Top 10 · Bedrock Guardrails</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-green-600">All Guards Active</span>
        </div>
      </div>
      <div className="p-4">
        {/* Score bar */}
        <div className="flex items-center gap-3 mb-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">AI SAFETY SCORE</p>
            <p className="text-xl font-black text-green-600">94<span className="text-xs font-semibold text-slate-400">/100</span></p>
          </div>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: '94%' }} />
          </div>
        </div>
        {/* Techniques table */}
        <div className="space-y-1.5">
          {techniques.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-[9px] font-mono text-slate-400 w-16 shrink-0">{t.id}</span>
              <span className="text-xs text-slate-700 font-medium flex-1 truncate">{t.name}</span>
              <span className="text-[9px] font-bold shrink-0" style={{ color: sevColor[t.severity] }}>{t.severity}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 bg-green-50 text-green-700 border border-green-100">{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── Tab 4: Security Posture ───────────────────────── */
const SecurityPostureView: React.FC = () => {
  const metrics = [
    { label: 'Overall Score', value: 78, color: '#7C3AED', icon: Shield },
    { label: 'IAM Health', value: 62, color: '#DC2626', icon: Lock },
    { label: 'CloudTrail', value: 91, color: '#10B981', icon: Activity },
    { label: 'Data Security', value: 84, color: '#2563EB', icon: Server },
  ];
  const findings = [
    { title: 'Root user login detected', sev: 'CRITICAL', time: '12m ago' },
    { title: 'Overprivileged IAM role', sev: 'HIGH', time: '1h ago' },
    { title: 'MFA not enabled (3 users)', sev: 'MEDIUM', time: '6h ago' },
    { title: 'S3 bucket public access', sev: 'HIGH', time: '1d ago' },
  ];
  const sevColor: Record<string, string> = { CRITICAL: '#DC2626', HIGH: '#D97706', MEDIUM: '#2563EB' };
  return (
    <div className="flex-1 bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">Security Posture</h2>
        <p className="text-xs text-slate-400 mt-0.5">AWS Security Hub · Continuous Monitoring</p>
      </div>
      <div className="p-4 space-y-3">
        {/* Score grid */}
        <div className="grid grid-cols-4 gap-2">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/60 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: m.color }} />
                <p className="text-base font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{m.label}</p>
                <div className="h-1 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Recent findings */}
        <div className="border border-slate-100 rounded-lg p-3">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Security Hub Findings</p>
          {findings.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 shrink-0" style={{ color: sevColor[f.sev] }} />
                <span className="text-xs text-slate-700">{f.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-bold" style={{ color: sevColor[f.sev] }}>{f.sev}</span>
                <span className="text-[10px] text-slate-400">{f.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── Tab 5: Cloud Security ─────────────────────────── */
const CloudSecurityView: React.FC = () => {
  const regions = [
    { name: 'us-east-1', events: 1284, anomalies: 3 },
    { name: 'us-west-2', events: 834, anomalies: 1 },
    { name: 'eu-west-1', events: 612, anomalies: 0 },
    { name: 'ap-south-1', events: 329, anomalies: 2 },
    { name: 'eu-central-1', events: 248, anomalies: 0 },
  ];
  const services = [
    { name: 'IAM', calls: 4821, icon: Lock, color: '#DC2626' },
    { name: 'S3', calls: 2183, icon: Server, color: '#2563EB' },
    { name: 'EC2', calls: 1692, icon: Globe, color: '#7C3AED' },
    { name: 'CloudTrail', calls: 988, icon: Radio, color: '#10B981' },
  ];
  return (
    <div className="flex-1 bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Cloud Security</h2>
          <p className="text-xs text-slate-400 mt-0.5">12 Regions · 90d Lookback · Live AWS</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-md px-2 py-1">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-[10px] font-semibold text-green-600">7,974 events analyzed</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* Region table */}
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Region</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-center">Events (90d)</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-right">Anomalies</span>
          </div>
          {regions.map((r, i) => (
            <div key={i} className="grid grid-cols-3 px-3 py-2 border-b border-slate-50 last:border-0 items-center">
              <span className="text-xs font-mono text-slate-600">{r.name}</span>
              <div className="flex items-center justify-center gap-1.5">
                <div className="h-1.5 rounded-full bg-blue-200 w-16 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(r.events / 1284) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{r.events.toLocaleString()}</span>
              </div>
              <div className="flex justify-end">
                {r.anomalies > 0
                  ? <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">{r.anomalies} ⚠</span>
                  : <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                }
              </div>
            </div>
          ))}
        </div>
        {/* Service breakdown */}
        <div className="grid grid-cols-4 gap-2">
          {services.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.name} className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50/60">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-xs font-bold text-slate-800">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.calls.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────── App shell wrapper ──────────────────────────── */
const VIEWS = [IncidentResponseView, PipelineView, AISecurityView, SecurityPostureView, CloudSecurityView];
const SIDEBAR_ACTIVE = ['incident', 'pipeline', 'ai-security', 'posture', 'cloud'];

const DashboardMockup: React.FC<{ tabIndex: number; accent: string }> = ({ tabIndex, accent }) => {
  const View = VIEWS[tabIndex];
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <Sidebar active={SIDEBAR_ACTIVE[tabIndex]} accent={accent} />
      <View />
    </div>
  );
};

/* ─────────────────────── Main component ────────────────────────────── */
const DashboardShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];

  return (
    <section className="py-24 relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-cover bg-bottom pointer-events-none"
        style={{ backgroundImage: 'url(/images/dashboard-panels.png)', opacity: 0.04 }} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-transparent to-white" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">Product Preview</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            See wolfir in Action
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            From raw CloudTrail events to complete incident resolution — every feature in one autonomous pipeline.
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = activeTab === i;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={isActive
                  ? { background: `${t.accent}12`, border: `1.5px solid ${t.accent}35`, color: t.accent, boxShadow: `0 2px 14px ${t.accent}22` }
                  : { background: 'white', border: '1.5px solid #E2E8F0', color: '#64748B' }
                }
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-5 gap-10 items-start">
          {/* Dashboard mockup — 3 cols */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  boxShadow: `0 24px 64px -20px ${tab.accent}30, 0 8px 24px -8px rgba(0,0,0,0.14)`,
                  border: '1px solid rgba(0,0,0,0.07)',
                }}
              >
                {/* Browser chrome */}
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono border border-slate-200">
                    app.wolfir.io / dashboard
                  </div>
                </div>
                {/* App shell */}
                <div style={{ height: '380px' }}>
                  <DashboardMockup tabIndex={activeTab} accent={tab.accent} />
                </div>
                {/* Bottom accent bar */}
                <div className="h-0.5"
                  style={{ background: `linear-gradient(90deg, transparent, ${tab.accent}70, transparent)` }} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description — 2 cols */}
          <div className="lg:col-span-2 lg:pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.28 }}
              >
                <div className="w-10 h-1 rounded-full mb-5" style={{ background: tab.accent }} />
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-snug">
                  {tab.title}
                </h3>
                <p className="text-base text-slate-500 leading-relaxed mb-8">
                  {tab.desc}
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {tab.pills.map((pill) => (
                    <span key={pill} className="px-3 py-1 rounded-lg text-xs font-semibold border"
                      style={{ background: `${tab.accent}08`, borderColor: `${tab.accent}25`, color: tab.accent }}>
                      {pill}
                    </span>
                  ))}
                </div>
                <a
                  href="#demo"
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#demo'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${tab.accent} 0%, ${tab.accent}CC 100%)`, boxShadow: `0 4px 16px ${tab.accent}35` }}
                >
                  Try it live
                  <ChevronRight className="w-4 h-4" />
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcase;
