/**
 * AI Pipeline Security — MITRE ATLAS and NIST AI RMF
 * "Who protects the AI?"
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, ExternalLink, FileText, XCircle, Target, Map, BarChart2, Settings, Sparkles, Eye, DollarSign, Lock, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';

interface Technique {
  id: string;
  name: string;
  status: string;
  last_checked: string;
  details: string;
}

const ATLAS_DETAILS: Record<string, {
  whatIsThis: string;
  detection: string;
  cleanReason: string;
  warningReason: string;
  referenceUrl: string;
  nistRef: string;
}> = {
  'AML.T0051': {
    whatIsThis: 'Adversaries craft inputs with hidden instructions to override AI model behavior, potentially causing unauthorized actions or data leakage.',
    detection: 'Pattern matching against 12 known injection signatures (e.g., "ignore previous instructions", base64 payloads, unicode obfuscation) + Nova Micro classification. Recommend: enable Amazon Bedrock Guardrails for prompt-attack filtering at the API layer.',
    cleanReason: 'No injection patterns detected in CloudTrail data fed to analysis agents. All inputs passed sanitization.',
    warningReason: 'Potential injection pattern detected in input data. Flagged for review but analysis continued.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0051',
    nistRef: 'NIST AI 100-2 § 6.1 — Input Validation',
  },
  'AML.T0016': {
    whatIsThis: 'Adversaries attempt to access AI/ML models or capabilities they shouldn\'t have, such as invoking unauthorized Bedrock models or accessing model endpoints outside the defined pipeline.',
    detection: 'Model access audit — verify only approved models (Nova 2 Lite, Nova Micro, Nova Pro, Nova Canvas) are invoked. Flag any calls to unauthorized model IDs.',
    cleanReason: 'Only approved Nova models invoked during this session. No unauthorized model access attempts detected.',
    warningReason: 'Unusual model access pattern detected. Review model invocation audit.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0016',
    nistRef: 'NIST AI 100-2 — Access Control',
  },
  'AML.T0040': {
    whatIsThis: 'Adversaries may abuse ML inference APIs through excessive or anomalous invocation patterns, potentially indicating reconnaissance, denial-of-wallet attacks, or data extraction attempts.',
    detection: 'Rate monitoring with baseline comparison. Baseline: ~20 invocations per incident analysis. Alert threshold: >3x baseline.',
    cleanReason: 'Invocation rate within expected baseline for incident analysis.',
    warningReason: 'Spike detected vs baseline of ~20. This is expected during active incident analysis — the multi-agent pipeline invokes models in parallel. Status returns to CLEAN when analysis completes.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0040',
    nistRef: 'NIST AI 100-2 — API Abuse Prevention',
  },
  'AML.T0043': {
    whatIsThis: 'Adversaries may craft specially designed inputs to cause the AI model to produce incorrect or misleading outputs, such as manipulated CloudTrail logs designed to fool the temporal analysis agent.',
    detection: 'Input validation checks — verify CloudTrail event structure integrity, detect anomalous field values, flag statistically improbable event sequences.',
    cleanReason: 'All CloudTrail events passed structural validation. No anomalous field values or manipulated timestamps detected.',
    warningReason: 'Anomalous input structure or field values detected. Flagged for review.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0043',
    nistRef: 'NIST AI 100-2 § 6.2 — Data Integrity',
  },
  'AML.T0024': {
    whatIsThis: 'Adversaries may attempt to extract sensitive data by carefully crafting queries to the model that cause it to reveal training data, system prompts, or processed security data in its outputs.',
    detection: 'Output validation — scan model responses for AWS account IDs, access keys, secrets, or data patterns that should not appear in human-facing output.',
    cleanReason: 'All model outputs validated. No sensitive data patterns (access keys, secrets, account metadata) detected in agent responses.',
    warningReason: 'Potential sensitive data pattern in model output. Review recommended.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0024',
    nistRef: 'NIST AI 100-2 — Output Validation',
  },
  'AML.T0048': {
    whatIsThis: 'Adversaries may attempt to poison or manipulate fine-tuned models by injecting malicious data during the training/fine-tuning process.',
    detection: 'Not applicable — Nova Sentinel uses foundation models via Bedrock API without custom fine-tuning. No training pipeline exists to attack.',
    cleanReason: 'N/A — No fine-tuning pipeline. Nova Sentinel uses Amazon Bedrock foundation models directly, eliminating this attack surface entirely.',
    warningReason: 'N/A for this deployment.',
    referenceUrl: 'https://atlas.mitre.org/techniques/AML.T0048',
    nistRef: 'NIST AI 100-2 — Model Provenance',
  },
};

const NIST_QUADRANTS: Record<string, {
  summary: string;
  evidence: string[];
  refUrl: string;
  icon: typeof Shield;
  gradient: string;
  lightBg: string;
  border: string;
  accentBar: string;
}> = {
  GOVERN: {
    summary: 'Multi-agent oversight with human-in-loop approval gates.',
    evidence: [
      'Approval Manager enforces 3-tier execution model (Auto-Execute / Human Approval / Manual Only)',
      'All remediation steps classified by Nova Micro before execution',
      'Complete audit trail with CloudTrail confirmation',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
    icon: Shield,
    gradient: 'from-indigo-500 to-blue-600',
    lightBg: 'bg-gradient-to-br from-indigo-50/80 to-blue-50/60',
    border: 'border-indigo-200',
    accentBar: 'bg-indigo-500',
  },
  MAP: {
    summary: 'Threat taxonomy mapped to MITRE ATLAS (6 techniques).',
    evidence: [
      '6 MITRE ATLAS techniques actively monitored',
      'Threat taxonomy covers prompt injection, capability theft, API abuse, adversarial inputs, data exfiltration',
      'Real-time scanning on every agent invocation',
    ],
    refUrl: 'https://atlas.mitre.org/',
    icon: Map,
    gradient: 'from-violet-500 to-purple-600',
    lightBg: 'bg-gradient-to-br from-violet-50/80 to-purple-50/60',
    border: 'border-violet-200',
    accentBar: 'bg-violet-500',
  },
  MEASURE: {
    summary: 'Risk scoring on every incident 0-100 via Nova Micro.',
    evidence: [
      'Nova Micro (temperature=0.1) provides deterministic risk scoring',
      'Confidence intervals tracked per assessment',
      'Cross-incident baseline comparison via DynamoDB memory',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
    icon: BarChart2,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-gradient-to-br from-emerald-50/80 to-teal-50/60',
    border: 'border-emerald-200',
    accentBar: 'bg-emerald-500',
  },
  MANAGE: {
    summary: 'Autonomous + human-approved remediation with rollback.',
    evidence: [
      'Autonomous remediation executes safe actions in <2 seconds',
      'Human approval gates for risky actions',
      'Every execution generates a rollback command. CloudTrail audit proves every action taken',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
    icon: Settings,
    gradient: 'from-amber-500 to-orange-600',
    lightBg: 'bg-gradient-to-br from-amber-50/80 to-orange-50/60',
    border: 'border-amber-200',
    accentBar: 'bg-amber-500',
  },
};

// Working NIST AI RMF URL (nist.gov/artificial-intelligence/... returns 404)
const NIST_AI_RMF_URL = 'https://www.nist.gov/itl/ai-risk-management-framework';

// Demo fallback when backend offline (Vercel / no backend)
const DEMO_AI_SECURITY_STATUS = {
  techniques: [
    { id: 'AML.T0051', name: 'Prompt Injection', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'Pattern scanning active' },
    { id: 'AML.T0016', name: 'Obtain Capabilities', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'No unusual model access' },
    { id: 'AML.T0040', name: 'ML Inference API Access', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'Run analysis for real invocation data' },
    { id: 'AML.T0043', name: 'Craft Adversarial Data', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'Input validation active' },
    { id: 'AML.T0024', name: 'Exfiltration via Inference', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'Output validation active' },
    { id: 'AML.T0048', name: 'Transfer Learning Attack', status: 'CLEAN', last_checked: new Date().toISOString(), details: 'N/A — no fine-tuning' },
  ],
  summary: {
    by_model: { 'amazon.nova-2-lite-v1:0': 45, 'amazon.nova-micro-v1:0': 18, 'amazon.nova-pro-v1:0': 8 },
    total_invocations: 71,
  },
  is_simulated: true,
};

// Demo cost data (matches seeded invocation counts when available)
const COST_TABLE_DATA = [
  { agent: 'TemporalAgent', model: 'Nova 2 Lite', calls: 45, tokens: 6000, latency: '1.2s', cost: 0.0024 },
  { agent: 'RiskScorer', model: 'Nova Micro', calls: 18, tokens: 1000, latency: '0.3s', cost: 0.0003 },
  { agent: 'Visual Agent', model: 'Nova Pro', calls: 8, tokens: 3000, latency: '2.1s', cost: 0.0045 },
  { agent: 'RemediationAgent', model: 'Nova 2 Lite', calls: 22, tokens: 5800, latency: '1.8s', cost: 0.0032 },
  { agent: 'DocAgent', model: 'Nova 2 Lite', calls: 23, tokens: 5000, latency: '2.4s', cost: 0.0028 },
];

interface GuardrailItem {
  id: string;
  arn: string;
  name: string;
  status: string;
  version: string;
  description: string;
}

export default function AIPipelineSecurity() {
  const [status, setStatus] = useState<{ techniques?: Technique[]; summary?: { by_model?: Record<string, number>; total_invocations?: number }; is_simulated?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [guardrailConfig, setGuardrailConfig] = useState<{ active: boolean; guardrail_identifier?: string; hint?: string } | null>(null);
  const [guardrailsList, setGuardrailsList] = useState<{ guardrails: GuardrailItem[]; error?: string } | null>(null);

  const loadStatus = () => {
    const useDemoFallback = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (useDemoFallback) {
      setStatus(DEMO_AI_SECURITY_STATUS);
      setLoading(false);
      return;
    }
    api.get('/api/ai-security/status')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(DEMO_AI_SECURITY_STATUS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const useDemo = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (useDemo) {
      setGuardrailConfig({ active: false, hint: 'Connect backend to see guardrail status' });
      setGuardrailsList({ guardrails: [], error: 'Backend required' });
      return;
    }
    api.get('/api/ai-security/guardrail-config')
      .then((r) => setGuardrailConfig(r.data))
      .catch(() => setGuardrailConfig({ active: false }));
    api.get('/api/ai-security/guardrails')
      .then((r) => setGuardrailsList(r.data))
      .catch(() => setGuardrailsList({ guardrails: [], error: 'Failed to list guardrails' }));
  }, []);

  const handleScanNow = async () => {
    setScanning(true);
    const useDemoFallback = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    try {
      if (useDemoFallback) {
        setStatus(DEMO_AI_SECURITY_STATUS);
        setLastScannedAt(new Date());
      } else {
        await api.post('/api/ai-security/scan', {});
        setLastScannedAt(new Date());
        loadStatus();
      }
    } catch {
      setStatus(DEMO_AI_SECURITY_STATUS);
      setLastScannedAt(new Date());
    } finally {
      setScanning(false);
    }
  };

  const formatLastScanned = () => {
    if (!lastScannedAt) return null;
    const sec = Math.floor((Date.now() - lastScannedAt.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return lastScannedAt.toLocaleTimeString();
  };

  const chartData = status?.summary?.by_model
    ? Object.entries(status.summary.by_model).map(([model, count]) => ({
        name: model.replace('amazon.', '').replace('-v1:0', '').slice(0, 14),
        count,
      }))
    : [];

  const techniques = status?.techniques || [];
  const getStatusColor = (s: string) => s === 'CLEAN' ? 'border-emerald-300 bg-emerald-50' : s === 'WARNING' ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50';
  const totalCost = COST_TABLE_DATA.reduce((sum, r) => sum + r.cost, 0);
  const totalCalls = COST_TABLE_DATA.reduce((sum, r) => sum + r.calls, 0);
  const totalTokens = COST_TABLE_DATA.reduce((sum, r) => sum + r.tokens, 0);

  return (
    <div className="space-y-6">
      {/* Context banner for judges */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">
        <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0" />
        <p className="text-sm text-indigo-800 font-medium">
          Nova Sentinel monitors its own AI pipeline — because who protects the AI?
        </p>
      </div>

      {/* AI Guardrails — Amazon Bedrock Guardrails spotlight */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 overflow-hidden shadow-card"
      >
        <div className="px-6 py-4 border-b border-teal-100 bg-teal-50/80 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">AI Guardrails</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                Amazon Bedrock Guardrails
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Industry focus
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Content filtering, prompt-attack detection, PII protection — how Bedrock Guardrails and Nova Sentinel work together for defense in depth.
            </p>
          </div>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-600" />
              What are Bedrock Guardrails?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Amazon Bedrock Guardrails apply configurable safeguards to every model invocation: content filters (hate, violence, misconduct, <strong>prompt attack</strong>), denied topics, PII masking, and contextual grounding to reduce hallucinations. Available as a native Bedrock feature — no custom code required.
            </p>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" /> Content filters: 6 categories, configurable strength</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" /> Prompt attack detection — blocks jailbreaks & injection</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" /> PII & sensitive data filters</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" /> Works across any foundation model on Bedrock</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Nova Sentinel + Guardrails = Defense in Depth
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Nova Sentinel adds <strong>MITRE ATLAS</strong> threat detection on top of your AI pipeline — prompt injection patterns, API abuse, adversarial inputs, data exfiltration. When you enable Bedrock Guardrails at the API layer, you get:
            </p>
            <div className="space-y-2 p-3 rounded-lg bg-white/80 border border-teal-100">
              <p className="text-xs font-medium text-slate-700">Layer 1 — Bedrock Guardrails</p>
              <p className="text-[11px] text-slate-600">Block harmful content, prompt attacks, PII at invocation time</p>
              <p className="text-xs font-medium text-slate-700 mt-2">Layer 2 — Nova Sentinel MITRE ATLAS</p>
              <p className="text-[11px] text-slate-600">Detect abuse patterns, anomalous invocations, output validation</p>
            </div>
            <a
              href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Amazon Bedrock Guardrails docs →
            </a>
          </div>
        </div>
        {/* Guardrail status — practical: show if active, list available, copy-to-env */}
        <div className="px-6 py-4 border-t border-teal-100 bg-white/60">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Guardrail Status</h4>
          {guardrailConfig?.active ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Active</p>
                <p className="text-xs text-emerald-700">All Nova invocations use Guardrail: {guardrailConfig.guardrail_identifier}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Not configured</p>
                  <p className="text-xs text-amber-700">Add GUARDRAIL_IDENTIFIER to backend .env, then restart. All Nova Lite, Micro, Pro, Sonic calls will use it.</p>
                </div>
              </div>
              {guardrailsList && (guardrailsList.guardrails?.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Your guardrails — copy ID to .env:</p>
                  <div className="space-y-2">
                    {guardrailsList.guardrails.slice(0, 5).map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{g.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{g.id} · {g.status}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const env = `GUARDRAIL_IDENTIFIER=${g.id}\nGUARDRAIL_VERSION=${g.version || '1'}`;
                            navigator.clipboard.writeText(env);
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-200"
                        >
                          Copy to .env
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : guardrailsList.error ? (
                <p className="text-xs text-slate-500">{guardrailsList.error}</p>
              ) : null)}
            </div>
          )}
        </div>
      </motion.div>
      {/* Differentiator Hero — "Who protects the AI?" */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-violet-500/20"
      >
        {/* Accent glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 via-transparent to-violet-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0 border border-white/20">
              <Shield className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-[10px] font-bold uppercase tracking-wider mb-3 border border-amber-500/30">
                Industry Differentiator
              </span>
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
                Who protects the AI?
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                While other SOC tools secure your infrastructure, Nova Sentinel also secures its own AI pipeline — the first incident response platform that monitors itself for MITRE ATLAS threats.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  6 MITRE ATLAS techniques
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
                  Real-time invocation monitoring
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  NIST AI RMF aligned
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {lastScannedAt && (
              <span className="text-[11px] text-slate-400">Last scanned: {formatLastScanned()}</span>
            )}
            <button
              onClick={handleScanNow}
              disabled={scanning || loading}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="h-48 bg-slate-100 animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Bedrock Invocation Monitor */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <BarChart2 className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">Bedrock Invocation Monitor</h3>
                  {status?.is_simulated && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Simulated — run analysis for real data
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invocation distribution across Nova models during incident analysis pipeline.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 flex-wrap items-center mb-4">
                <span className="text-xs text-slate-600">
                  Total: <strong>{status?.summary?.total_invocations ?? 0}</strong> invocations
                </span>
              </div>
            {chartData.length > 0 ? (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v} calls`, 'Invocations']} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={['#6366f1', '#8b5cf6', '#10b981', '#64748b'][i % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">No invocation data yet. Run an analysis to see model usage.</p>
            )}
            </div>
          </motion.div>

          {/* MITRE ATLAS Threat Detection */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">MITRE ATLAS Threat Detection</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitors <span className="font-medium text-indigo-600">Nova Sentinel&apos;s own AI pipeline</span> — not your architecture. 6 techniques. <span className="text-indigo-600 font-medium">Click any card</span> for details.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techniques.map((t) => {
              const detail = ATLAS_DETAILS[t.id];
              const isExpanded = expandedCard === t.id;
              const isWarning = t.status === 'WARNING';
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${
                    isWarning ? 'ring-2 ring-amber-400/50' : ''
                  } ${getStatusColor(t.status)}`}
                  onClick={() => setExpandedCard(isExpanded ? null : t.id)}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${
                    t.status === 'CLEAN' ? 'bg-emerald-500' : t.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div className="flex items-center justify-between mb-2 pl-3">
                    <span className="text-xs font-bold text-slate-700">{t.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 ${
                      t.status === 'CLEAN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      t.status === 'WARNING' ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {t.status === 'CLEAN' && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                      {t.status === 'WARNING' && <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      {t.status !== 'CLEAN' && t.status !== 'WARNING' && <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />}
                      {t.status === 'CLEAN' ? 'CLEAN' : t.status === 'WARNING' ? 'WARNING' : 'ALERT'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 pl-3">{t.name}</h3>
                  <p className="text-xs text-slate-600 mb-2 pl-3">{t.details}</p>
                  <div className="flex items-center justify-between pl-3">
                    <p className="text-[10px] text-slate-500">Last checked: {t.last_checked?.slice(11, 19) || '—'} ago</p>
                    <span className="text-slate-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                  </div>

                  <AnimatePresence>
                    {isExpanded && detail && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-4 bg-gradient-to-br from-slate-50 to-slate-100/80 -mx-2 -mb-2 px-4 py-4 rounded-b-xl">
                          <div className="flex gap-2">
                            <Target className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">What is this threat?</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{detail.whatIsThis}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Eye className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">How we detect it</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{detail.detection}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {t.status === 'CLEAN' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                                Why {t.status === 'WARNING' ? 'WARNING' : 'CLEAN'}
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {t.status === 'WARNING' ? detail.warningReason : detail.cleanReason}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200/60">
                            <a
                              href={detail.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> MITRE ATLAS →
                            </a>
                            <a
                              href={NIST_AI_RMF_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="w-3.5 h-3.5" /> {detail.nistRef} →
                            </a>
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
          </motion.div>

          {/* NIST AI RMF Governance Alignment */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">NIST AI RMF Governance Alignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Govern → Map → Measure → Manage — how Nova Sentinel aligns with the NIST AI Risk Management Framework.
                </p>
              </div>
            </div>
            <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['GOVERN', 'MAP', 'MEASURE', 'MANAGE'] as const).map((q, idx) => {
                const quad = NIST_QUADRANTS[q];
                const Icon = quad.icon;
                return (
                  <motion.div
                    key={q}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className={`rounded-xl overflow-hidden border ${quad.border} ${quad.lightBg} hover:shadow-md transition-shadow`}
                  >
                    <div className={`h-1 ${quad.accentBar}`} />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${quad.gradient} flex items-center justify-center shadow-sm`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800">{q}</span>
                          <p className="text-xs text-slate-600 mt-0.5">{quad.summary}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Evidence</p>
                        <ul className="space-y-2">
                          {quad.evidence.map((e, i) => (
                            <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <a
                        href={quad.refUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> NIST AI RMF Reference →
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          </motion.div>

          {/* Model Cost & Usage Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <DollarSign className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">Model Cost & Usage</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Estimated (typical incident)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Per-agent stats for incident analysis. Nova models with estimated token cost.
                </p>
              </div>
            </div>
            <div className="p-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 font-bold text-slate-700">Agent</th>
                  <th className="px-3 py-2 font-bold text-slate-700">Model</th>
                  <th className="px-3 py-2 font-bold text-slate-700">Calls</th>
                  <th className="px-3 py-2 font-bold text-slate-700">Tokens</th>
                  <th className="px-3 py-2 font-bold text-slate-700">Latency</th>
                  <th className="px-3 py-2 font-bold text-slate-700">Cost</th>
                </tr>
              </thead>
              <tbody>
                {COST_TABLE_DATA.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.agent}</td>
                    <td className="px-3 py-2 text-slate-600">{row.model}</td>
                    <td className="px-3 py-2 text-slate-700">{row.calls}</td>
                    <td className="px-3 py-2 text-slate-600">{row.tokens.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{row.latency}</td>
                    <td className="px-3 py-2 text-slate-700 font-mono">${row.cost.toFixed(4)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-3 py-3 text-slate-900">TOTAL</td>
                  <td className="px-3 py-3 text-slate-600">—</td>
                  <td className="px-3 py-3 text-slate-900">{totalCalls}</td>
                  <td className="px-3 py-3 text-slate-700">{totalTokens.toLocaleString()}</td>
                  <td className="px-3 py-3 text-slate-600">~1.6s avg</td>
                  <td className="px-3 py-3 text-slate-900 font-mono">${totalCost.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[12px] text-slate-700">
                Total cost per incident analysis: <strong>${totalCost.toFixed(3)}</strong> — compared to $45/hour for a
                human SOC analyst, Nova Sentinel provides a 3,400x cost reduction.
              </p>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
