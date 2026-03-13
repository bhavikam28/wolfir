/**
 * Platform Features — Seddle-style tabbed layout
 * Analyze | Orchestrate | Secure | Remediate | Report | Platform
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Brain, Zap, Shield, FileText, Network, Lock, Target,
  BarChart3, Mic, Database, Cpu, Layers, MessageSquare, Key, Settings
} from 'lucide-react';
import DashboardPreview from './DashboardPreview';

type TabId = 'analyze' | 'orchestrate' | 'secure' | 'remediate' | 'report' | 'platform';

const TABS: { id: TabId; label: string; icon: typeof Eye }[] = [
  { id: 'analyze', label: 'Analyze', icon: Eye },
  { id: 'orchestrate', label: 'Orchestrate', icon: Network },
  { id: 'secure', label: 'Secure', icon: Lock },
  { id: 'remediate', label: 'Remediate', icon: Shield },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'platform', label: 'Platform', icon: Settings },
];

const FEATURES: Record<TabId, Array<{
  icon: typeof Eye;
  title: string;
  desc: string;
  bullets: string[];
}>> = {
  analyze: [
    {
      icon: Eye,
      title: 'Multi-Agent Pipeline',
      desc: '5 specialized agents work in sequence: Detect, Investigate, Classify, Remediate, Document. Each agent uses the Nova model best suited for its task — no manual triage.',
      bullets: ['Detect → Investigate → Classify → Remediate → Document', 'Shared state across pipeline', 'Single run from CloudTrail to remediation plan', 'Nova Pro, Nova 2 Lite, Nova Micro orchestrated'],
    },
    {
      icon: MessageSquare,
      title: 'Agentic Query',
      desc: 'Autonomous agent that picks its own tools from 6 AWS MCP servers. Ask natural language questions — the agent plans and executes IAM audits, CloudTrail lookups, Security Hub checks.',
      bullets: ['Autonomous tool selection', '23 MCP tools across 5 AWS servers', 'Multi-turn conversation support', 'No predefined workflow required'],
    },
    {
      icon: Database,
      title: 'CloudTrail Analysis',
      desc: 'Connect your AWS account and analyze real CloudTrail events. One-click fetch from 12 regions. Credentials stay local — never stored or transmitted.',
      bullets: ['Real-time CloudTrail lookup', 'Multi-region support', 'Demo mode with sample scenarios', 'AWS SSO / IAM Identity Center supported'],
    },
    {
      icon: Brain,
      title: 'Timeline & Root Cause',
      desc: 'Nova 2 Lite generates chronological timelines and traces kill chains. 90-day lookback for correlation. Confidence scoring on every analysis.',
      bullets: ['Chronological event ordering', 'Kill chain tracing', 'Root cause identification', 'Confidence scores'],
    },
    {
      icon: Zap,
      title: 'Risk Classification',
      desc: 'Nova Micro provides instant severity scoring. Deterministic, sub-second classification. Risk scores per finding with actionable thresholds.',
      bullets: ['Sub-1-second classification', 'Deterministic scoring', 'Per-finding risk levels', 'Nova Micro optimized'],
    },
    {
      icon: Eye,
      title: 'Visual Architecture Analysis',
      desc: 'Upload architecture diagrams — Nova Pro identifies misconfigurations, open ports, IAM issues. 50+ check types in under 5 seconds.',
      bullets: ['PNG/JPG diagram support', '50+ security checks', 'Misconfiguration detection', 'IAM and network analysis'],
    },
  ],
  orchestrate: [
    {
      icon: Cpu,
      title: '5 Nova Models',
      desc: 'Nova Pro (multimodal), Nova 2 Lite (reasoning), Nova Micro (classification), Nova 2 Sonic (voice-ready), Nova Canvas (image generation). Each model used for its strength.',
      bullets: ['Model specialization per task', 'Cost and latency optimized', 'Failover and retry logic', 'Cross-region inference ready'],
    },
    {
      icon: Network,
      title: '6 AWS MCP Servers',
      desc: 'CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security. 23+ tools registered. Orchestrated via Strands Agents SDK with shared context.',
      bullets: ['CloudTrail: events, trail status, anomalies', 'IAM: user/role audit, policy analysis', 'CloudWatch: alarms, billing, EC2 security', 'Security Hub: findings, GuardDuty', 'Nova Canvas: report covers', 'AI Security: MITRE ATLAS pipeline monitoring'],
    },
    {
      icon: Layers,
      title: 'Cross-Incident Memory',
      desc: 'DynamoDB-backed persistent memory. Run multiple analyses — the pipeline detects same-attacker patterns. Ask "have we seen this before?"',
      bullets: ['DynamoDB persistent storage', 'IP and actor correlation', 'Campaign probability scoring', 'Voice assistant integration'],
    },
    {
      icon: Target,
      title: 'Security Health Check',
      desc: 'Run 5 agent queries with no incident required. IAM audit, CloudTrail anomalies, billing, Security Hub — proactive posture assessment.',
      bullets: ['5 autonomous agent queries', 'No incident required', 'Proactive security audit', 'Structured results by category'],
    },
  ],
  secure: [
    {
      icon: Lock,
      title: 'Bedrock Guardrails',
      desc: 'Content filters, prompt-attack blocking, PII masking at the API level. Configure once in .env — applies to every Nova invocation. Two-layer defense with MITRE ATLAS.',
      bullets: ['Content filters (hate, violence, misconduct)', 'Prompt attack prevention', 'PII masking (AWS keys, SSN, etc.)', 'Configurable per deployment'],
    },
    {
      icon: Shield,
      title: 'MITRE ATLAS',
      desc: '6 techniques monitored: prompt injection, capability theft, API abuse, adversarial inputs, data exfiltration, model poisoning. wolfir monitors its own AI pipeline.',
      bullets: ['6 MITRE ATLAS techniques', 'Real-time invocation monitoring', 'Pattern matching + Nova Micro classification', 'Who protects the AI?'],
    },
    {
      icon: Target,
      title: 'Threat Intelligence',
      desc: 'IP reputation lookup and timeline enrichment. Integrate AbuseIPDB, VirusTotal. Flag malicious IPs in attack path visualization.',
      bullets: ['IP reputation lookup', 'Timeline enrichment', 'Attack path integration', 'Optional API keys'],
    },
  ],
  remediate: [
    {
      icon: Shield,
      title: 'Autonomous Remediation',
      desc: 'AI-generated remediation plans with human-in-the-loop approval. 3-tier execution: Auto-Execute, Human Approval, Manual Only. Nova Micro classifies each step.',
      bullets: ['3-step approval flow', 'IAM, security group, config fixes', 'Before/after state snapshots', 'CloudTrail confirmation'],
    },
    {
      icon: Zap,
      title: 'One-Click Apply',
      desc: 'Execute remediation steps with proof. CloudTrail confirms every action. Rollback support. Demo mode for safe testing.',
      bullets: ['One-click apply fix', 'Execution proof per step', 'CloudTrail audit trail', 'Demo mode for testing'],
    },
  ],
  report: [
    {
      icon: Lock,
      title: 'Compliance Mapping',
      desc: 'Auto-map findings to CIS, NIST, SOC 2, PCI-DSS, SOX, HIPAA. No manual auditing. Framework-specific control IDs and references.',
      bullets: ['6 compliance frameworks', 'Automatic control mapping', 'Audit-ready output', 'Framework references'],
    },
    {
      icon: FileText,
      title: 'Auto Documentation',
      desc: 'JIRA tickets, Slack alerts, Confluence post-mortems generated automatically. Brand-aligned. Export to multiple formats.',
      bullets: ['JIRA ticket generation', 'Slack alert formatting', 'Confluence post-mortems', 'Custom templates'],
    },
    {
      icon: BarChart3,
      title: 'Cost Impact',
      desc: 'Financial exposure analysis with ROI metrics. Estimate cost of incident, blast radius, and remediation value.',
      bullets: ['Cost estimation per incident', 'Blast radius analysis', 'ROI metrics', 'Executive briefing ready'],
    },
    {
      icon: Eye,
      title: 'Report Export',
      desc: 'PDF export with Nova Canvas cover image. Executive briefing. Print-ready layouts. Copy to clipboard.',
      bullets: ['PDF with custom cover', 'Executive briefing', 'Markdown export', 'Nova Canvas integration'],
    },
  ],
  platform: [
    {
      icon: Key,
      title: 'AWS SSO Support',
      desc: 'IAM Identity Center (SSO) fully supported. Configure once with aws configure sso. Select profile in console — no separate flow.',
      bullets: ['aws sso login support', 'Multi-account profiles', 'CLI profile selection', 'Zero-trust credentials'],
    },
    {
      icon: Shield,
      title: 'Credentials Stay Local',
      desc: 'No keys stored or transmitted. Use AWS CLI profile or SSO. Audit our open-source code. Your account, your data.',
      bullets: ['Local credentials only', 'No server-side storage', 'Open source auditable', 'Your AWS account'],
    },
    {
      icon: Mic,
      title: 'Voice (Aria)',
      desc: 'Nova 2 Sonic integration-ready. Hands-free investigation with natural language. Ask "what happened?" and get spoken analysis.',
      bullets: ['Voice query support', 'Nova 2 Sonic ready', 'Incident context aware', 'Hands-free analysis'],
    },
    {
      icon: Database,
      title: 'Incident History',
      desc: 'Cross-incident correlation, similar incident lookup, search. DynamoDB-backed. Track patterns across time.',
      bullets: ['Incident list and search', 'Similar incident lookup', 'Correlation across incidents', 'Stats and trends'],
    },
  ],
};

const PlatformFeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('analyze');
  const features = FEATURES[activeTab];

  return (
    <section className="py-20 bg-white border-y border-slate-200/80" id="platform-features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
            Platform Features
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Everything You Need for Incident Response
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            From detection to remediation to documentation — multi-agent orchestration, Guardrails, and compliance mapping.
          </p>
        </motion.div>

        {/* Feature preview image — dashboard screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-4xl mx-auto"
        >
          <DashboardPreview />
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Feature cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-base mb-2">{f.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">{f.desc}</p>
                      <ul className="space-y-1.5">
                        {f.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default PlatformFeaturesSection;
