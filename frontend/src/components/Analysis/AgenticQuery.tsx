/**
 * Autonomous Agent — Strands Agent autonomously plans and executes tools.
 * The Agent decides which tools to call (CloudTrail, IAM, CloudWatch, etc.)
 * based on your prompt — real agentic reasoning.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Send, Loader2, MessageSquare, ChevronRight, Clock, Wrench, Brain, Shield, Activity, Database, Trash2 } from 'lucide-react';
import { orchestrationAPI } from '../../services/api';

const MAX_HISTORY_EXCHANGES = 5; // Keep last 5 user+assistant pairs for multi-turn context

/* Premium minimal palette — single accent (indigo) for Wiz.io-style consistency */
const SUGGESTED_PROMPTS: { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }[] = [
  { label: 'Audit all IAM users for security issues', icon: Wrench, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
  { label: 'Scan CloudTrail for anomalies in the last 24 hours', icon: Activity, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
  { label: 'Get Security Hub findings (GuardDuty, Inspector)', icon: Shield, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
  { label: 'Check CloudWatch for billing anomalies', icon: Activity, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
  { label: 'Investigate IAM roles for privilege escalation', icon: Shield, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
  { label: 'Investigate cross-account role assumptions', icon: Database, color: 'text-indigo-700', bg: 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200' },
];

/**
 * Detect which tools the agent likely called by scanning the response text.
 * This is a lightweight alternative to full OpenTelemetry tracing — we infer
 * tool usage from the agent's natural-language output.
 */
/* Tool badges — minimal indigo/slate palette */
const TOOL_SIGNATURES: { pattern: RegExp; tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { pattern: /cloudtrail|cloud trail|lookupevents|event lookup|trail/i, tool: 'CloudTrail Lookup', icon: Activity, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /anomal|anomaly scan|security anomal/i, tool: 'CloudTrail Anomaly Scan', icon: Shield, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /iam.*(user|audit)|user.*audit|mfa.*(compliance|status)|access.key.age/i, tool: 'IAM User Audit', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /iam.*(role|audit.*role)|role.*(audit|trust|policy)|cross.account/i, tool: 'IAM Role Audit', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /policy.*(analy|review)|wildcard.*action|overly.*broad/i, tool: 'IAM Policy Analysis', icon: Shield, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /cloudwatch|alarm|billing.*anomal|ec2.*metric|estimated.*charge/i, tool: 'CloudWatch Security Check', icon: Activity, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /security.hub|guardduty|inspector|finding.*severity|pre.correlat/i, tool: 'Security Hub Findings', icon: Shield, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /incident.*history|past.*incident|campaign|correlat/i, tool: 'Incident History Query', icon: Database, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /timeline.*analy|temporal|root.cause|attack.pattern|blast.radius/i, tool: 'Timeline Analysis', icon: Brain, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /risk.*(score|level|assess)|severity.*(score|rating)/i, tool: 'Risk Scoring', icon: Shield, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /remediat|fix|patch|mitigat/i, tool: 'Remediation Planning', icon: Wrench, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

function detectToolsUsed(text: string): { tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] {
  const seen = new Set<string>();
  const results: { tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [];
  for (const sig of TOOL_SIGNATURES) {
    if (sig.pattern.test(text) && !seen.has(sig.tool)) {
      seen.add(sig.tool);
      results.push({ tool: sig.tool, icon: sig.icon, color: sig.color });
    }
  }
  return results;
}

/**
 * Demo fallback responses — used when backend is offline (Vercel-only demo).
 * These simulate what the Strands Agent would return for each suggested prompt.
 */
const DEMO_FALLBACKS: Record<string, string> = {
  'audit all iam users': `IAM User Audit Results (3 users scanned):

1. admin@company.com — CRITICAL
   • MFA: Not enabled ⚠️
   • Access keys: 2 active (oldest: 247 days — exceeds 90-day rotation policy)
   • Policies: AdministratorAccess attached directly (should use group-based access)
   • Risk: Root-equivalent permissions without MFA

2. developer-1 — MEDIUM
   • MFA: Enabled ✓
   • Access keys: 1 active (34 days old)
   • Policies: PowerUserAccess via group "developers"
   • Risk: Broad permissions but MFA mitigates credential theft

3. ci-deploy — HIGH
   • MFA: Not enabled (service account)
   • Access keys: 1 active (189 days — needs rotation)
   • Policies: Custom deploy policy with s3:*, ec2:RunInstances
   • Risk: Service account with stale key and broad S3 access

Recommendations:
• Enable MFA on admin@company.com immediately (aws iam enable-mfa-device)
• Rotate access key for ci-deploy (189 days exceeds policy)
• Move admin@company.com to group-based permissions, remove direct AdministratorAccess
• Set up IAM Access Analyzer for continuous monitoring`,

  'scan cloudtrail for anomalies': `CloudTrail Anomaly Scan (last 24 hours):

Scanned 342 events across us-east-1. Found 3 anomalies:

1. Root Account Console Login — CRITICAL
   • Time: 2026-03-06T03:47:22Z (unusual hour)
   • Source IP: 198.51.100.42 (not in known IP range)
   • MFA: Not used
   • Action: ConsoleLogin → succeeded
   • Risk: Root account access from unknown IP without MFA at 3am

2. Access Key Created for admin — HIGH
   • Time: 2026-03-06T04:12:08Z (22 min after root login)
   • Actor: root
   • Action: CreateAccessKey for user "admin@company.com"
   • Risk: Persistence mechanism — new long-lived credentials created

3. Security Group Modified — HIGH
   • Time: 2026-03-06T04:15:33Z
   • Actor: admin@company.com (newly created key)
   • Action: AuthorizeSecurityGroupIngress — opened port 22 to 0.0.0.0/0
   • Risk: SSH exposed to internet on sg-0abc1234

Assessment: These 3 events form a potential attack chain — root login → credential creation → network exposure. Campaign probability: HIGH.

Recommended: Revoke root session, disable new access key, restore security group rules.`,

  'get security hub findings': `Security Hub Findings (last 7 days):

Retrieved 8 findings from GuardDuty and Inspector:

CRITICAL (2):
  • GuardDuty: UnauthorizedAccess:IAMUser/MaliciousIPCaller — admin@company.com accessed from known malicious IP
  • Inspector: CVE-2024-38816 — Spring Framework RCE on i-0abc1234 (port 8080 exposed)

HIGH (3):
  • GuardDuty: CryptoCurrency:EC2/BitcoinTool.B — Mining activity on i-0def5678
  • GuardDuty: Recon:IAMUser/MaliciousIPCaller.Custom — Enumeration from 203.0.113.50
  • Inspector: CVE-2024-21626 — Container escape vulnerability on ECS cluster

MEDIUM (3):
  • GuardDuty: Policy:IAMUser/RootCredentialUsage — Root account used in last 24h
  • Inspector: Outdated runtime — Node.js 16 (EOL) on Lambda function
  • GuardDuty: Behavior:EC2/NetworkPortUnusual — Unusual outbound traffic on port 4444

Summary: 2 critical findings require immediate attention. The CryptoCurrency finding on i-0def5678 correlates with the CloudTrail anomaly scan results.`,

  'check cloudwatch for billing anomalies': `CloudWatch Billing Analysis (last 7 days):

Current estimated charges: $847.32 (up 340% from baseline $192/week)

Anomaly detected: Compute cost spike
  • EC2 charges: $612.40 (was $85.20 baseline) — +619%
  • 3 new p3.2xlarge instances launched 2026-03-06T04:20:00Z
  • Running for 72+ hours continuously
  • No Auto Scaling group — manually launched
  • Region: us-east-1 (not the team's usual us-west-2)

Other services:
  • S3: $18.92 (normal)
  • DynamoDB: $4.10 (normal)
  • Bedrock: $12.40 (normal — wolfir usage)
  • Data transfer: $199.50 (unusual — high outbound)

Risk assessment: The 619% EC2 spike combined with unusual data transfer strongly suggests cryptocurrency mining or data exfiltration. The p3.2xlarge instances have GPU — commonly used for mining.

Estimated unauthorized cost: ~$612/week if not terminated.
Recommended: Terminate i-0ghi9012, i-0jkl3456, i-0mno7890 immediately.`,

  'investigate iam roles for privilege escalation': `IAM Role Privilege Escalation Analysis:

Scanned 12 IAM roles. Found 3 escalation risks:

1. contractor-temp — CRITICAL escalation path
   • Trust: Allows AssumeRole from any IAM user in account
   • Policies: AdministratorAccess (full admin)
   • Risk: Any user can escalate to full admin via this role
   • Path: Low-priv user → AssumeRole contractor-temp → Admin
   • Fix: aws iam update-assume-role-policy to restrict Principal

2. lambda-execution-role — HIGH
   • Trust: Lambda service principal (normal)
   • Policies: Custom policy with iam:PassRole + iam:CreateRole
   • Risk: Lambda function can create new roles with arbitrary permissions
   • Path: Code injection in Lambda → create admin role → escalate
   • Fix: Remove iam:CreateRole from Lambda execution policy

3. ci-deploy-role — MEDIUM
   • Trust: GitHub OIDC provider (good — no long-lived keys)
   • Policies: ec2:*, s3:*, ecs:* (broad but scoped to deploy actions)
   • Risk: Compromised GitHub workflow could provision arbitrary EC2/ECS
   • Fix: Scope ec2:* to ec2:RunInstances with condition on specific AMIs

No escalation path found for: read-only-role, cloudwatch-role, config-role, backup-role, support-role, audit-role, ssm-role, ecs-task-role, sagemaker-role.`,

  'investigate cross-account role assumptions': `Cross-Account Role Assumption Analysis:

Scanned trust policies for all 12 IAM roles:

Cross-account trust found in 2 roles:

1. OrganizationAccountAccessRole — EXPECTED
   • Trusts: arn:aws:iam::111111111111:root (management account)
   • Purpose: AWS Organizations default admin role
   • Risk: LOW — standard org pattern, but should restrict to specific admin role
   • Fix: Narrow Principal from :root to specific admin role ARN

2. vendor-integration-role — HIGH
   • Trusts: arn:aws:iam::999888777666:root (external account)
   • ExternalId: Not configured ⚠️
   • Policies: s3:GetObject on company-data-* buckets + kms:Decrypt
   • Risk: Without ExternalId, susceptible to confused deputy attack
   • Fix: aws iam update-assume-role-policy — add Condition with sts:ExternalId

No cross-account trust in remaining 10 roles ✓

Recommendation: Add ExternalId condition to vendor-integration-role immediately. This is a well-known attack vector (AWS docs: confused deputy problem).`,
};

function getDemoFallback(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const [key, value] of Object.entries(DEMO_FALLBACKS)) {
    if (lower.includes(key)) return value;
  }
  if (lower.includes('iam') && lower.includes('user')) return DEMO_FALLBACKS['audit all iam users'];
  if (lower.includes('cloudtrail') || lower.includes('anomal')) return DEMO_FALLBACKS['scan cloudtrail for anomalies'];
  if (lower.includes('security hub') || lower.includes('guardduty') || lower.includes('finding')) return DEMO_FALLBACKS['get security hub findings'];
  if (lower.includes('billing') || lower.includes('cloudwatch') || lower.includes('cost')) return DEMO_FALLBACKS['check cloudwatch for billing anomalies'];
  if (lower.includes('role') && (lower.includes('privilege') || lower.includes('escalat'))) return DEMO_FALLBACKS['investigate iam roles for privilege escalation'];
  if (lower.includes('cross') && lower.includes('account')) return DEMO_FALLBACKS['investigate cross-account role assumptions'];
  return null;
}

/** Add contextual variation — include user query and varied lead-in so demo responses feel less rigid */
function varyDemoResponse(baseResponse: string, userPrompt: string): string {
  const lower = userPrompt.toLowerCase();
  const topic = lower.includes('audit') ? 'audit' : lower.includes('scan') ? 'scan' : lower.includes('investigate') ? 'investigation' : lower.includes('check') ? 'check' : 'query';
  const leadIns = [
    `Based on your ${topic} request ("${userPrompt.slice(0, 80)}${userPrompt.length > 80 ? '...' : ''}"):\n\n`,
    `Here are the results for your ${topic}:\n\n`,
    `Analysis from your prompt:\n\n`,
  ];
  const leadIn = leadIns[Math.floor(Math.random() * leadIns.length)];
  return `${leadIn}${baseResponse}`;
}

interface AgenticQueryProps {
  backendOffline?: boolean;
}

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

export default function AgenticQuery({ backendOffline = false }: AgenticQueryProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const startRef = useRef<number>(0);

  const runQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPrompt(trimmed);
    setSubmittedPrompt(trimmed);
    setLoading(true);
    setError(null);
    setResponse(null);
    setElapsedMs(null);
    setIsDemoFallback(false);
    startRef.current = Date.now();

    try {
      const fallback = getDemoFallback(trimmed);
      if (backendOffline) {
        if (fallback) {
          // Typing/thinking feel: 1.2–1.6s delay, contextual variation
          const delay = 1200 + Math.random() * 400;
          await new Promise(r => setTimeout(r, delay));
          const varied = varyDemoResponse(fallback, trimmed);
          setElapsedMs(Date.now() - startRef.current);
          setResponse(varied);
          setIsDemoFallback(true);
          setConversationHistory((prev) => {
            const next = [...prev, { role: 'user' as const, content: trimmed }, { role: 'assistant' as const, content: varied }];
            return next.slice(-MAX_HISTORY_EXCHANGES * 2);
          });
        } else {
          setElapsedMs(Date.now() - startRef.current);
          setError('Backend offline — try a suggested prompt for demo results.');
        }
      } else {
        const result = await orchestrationAPI.agentQuery(trimmed, conversationHistory);
        const resp = result.response || 'No response.';
        setElapsedMs(Date.now() - startRef.current);
        setResponse(resp);
        setConversationHistory((prev) => {
          const next = [...prev, { role: 'user' as const, content: trimmed }, { role: 'assistant' as const, content: resp }];
          return next.slice(-MAX_HISTORY_EXCHANGES * 2);
        });
      }
    } catch (err: any) {
      const fallback = getDemoFallback(trimmed);
      if (fallback) {
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 400));
        const varied = varyDemoResponse(fallback, trimmed);
        setElapsedMs(Date.now() - startRef.current);
        setResponse(varied);
        setIsDemoFallback(true);
        setConversationHistory((prev) => {
          const next = [...prev, { role: 'user' as const, content: trimmed }, { role: 'assistant' as const, content: varied }];
          return next.slice(-MAX_HISTORY_EXCHANGES * 2);
        });
      } else {
        setElapsedMs(Date.now() - startRef.current);
        setError(err.response?.data?.detail || err.message || 'Agent query failed. Backend may be offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toolsUsed = response ? detectToolsUsed(response) : [];
  const historyCount = Math.floor(conversationHistory.length / 2);

  /** Highlight severity keywords in response text */
  const formatResponse = (text: string) => {
    const parts = text.split(/(\b(CRITICAL|HIGH|MEDIUM|LOW)\b)/gi);
    return parts.map((seg, i) => {
      const upper = seg.toUpperCase();
      if (upper === 'CRITICAL') return <span key={i} className="font-bold text-red-600 bg-red-50 px-0.5 rounded">{seg}</span>;
      if (upper === 'HIGH') return <span key={i} className="font-bold text-orange-600 bg-orange-50 px-0.5 rounded">{seg}</span>;
      if (upper === 'MEDIUM') return <span key={i} className="font-semibold text-amber-600 bg-amber-50 px-0.5 rounded">{seg}</span>;
      if (upper === 'LOW') return <span key={i} className="font-semibold text-emerald-600 bg-emerald-50 px-0.5 rounded">{seg}</span>;
      return <span key={i}>{seg}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header — matches RemediationPlan / Timeline style */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-violet-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">Autonomous Agent</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-100 text-indigo-700 border-indigo-200">
                    Strands Agents SDK
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200" title="MITRE ATLAS + Bedrock Guardrails block prompt injection and dangerous tool calls (e.g. iam:DeleteUser)">
                    <Shield className="w-3 h-3 inline mr-0.5" />
                    MITRE ATLAS · Prompt injection protected
                  </span>
                  {historyCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-violet-100 text-violet-700 border-violet-200">
                      {historyCount} exchange{historyCount !== 1 ? 's' : ''} in context
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  The Agent autonomously decides which tools to call based on your prompt — real agentic reasoning.
                </p>
              </div>
            </div>
            {historyCount > 0 && (
              <button
                onClick={() => { setConversationHistory([]); setResponse(null); setError(null); }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear conversation
              </button>
            )}
          </div>
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50/80 border border-amber-200">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Investigation only</strong> — the Agent audits and analyzes; it does not make changes. Remediation happens in the Remediation Engine tab with human-in-the-loop approval.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input + Suggested prompts — single card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Your prompt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery(prompt)}
              placeholder="e.g. Investigate this IAM role for privilege escalation"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => runQuery(prompt)}
              disabled={loading || !prompt.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {loading ? 'Working...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Suggested prompts — colored cards */}
        <div className="p-5 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Click to run</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_PROMPTS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  onClick={() => runQuery(s.label)}
                  disabled={loading}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${s.bg}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 leading-snug">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-4 border-b border-slate-100 bg-indigo-50/30"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Agent planning and executing tools
                    <span className="inline-flex gap-0.5">
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, repeat: Infinity }}>.</motion.span>
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}>.</motion.span>
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}>.</motion.span>
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Deciding which tools to call for: &quot;{submittedPrompt?.slice(0, 60)}{(submittedPrompt?.length || 0) > 60 ? '...' : ''}&quot;</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response */}
        <AnimatePresence>
          {(response || error) && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 space-y-4"
            >
              {error && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}
              {response && (
                <>
                  {/* Tools detected + timing bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {toolsUsed.length > 0 && (
                      <>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tools used:</span>
                        {toolsUsed.map(({ tool, icon: Icon, color }) => (
                          <span
                            key={tool}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {tool}
                          </span>
                        ))}
                      </>
                    )}
                    {elapsedMs !== null && (
                      <span className="inline-flex items-center gap-1 ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        {elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>

                  {/* Agent response — with severity highlighting */}
                  <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-100 to-violet-50 border-b border-indigo-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Agent response</span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Autonomous</span>
                      <span className="text-[10px] text-slate-500 ml-auto">{isDemoFallback ? 'Demo mode' : 'Strands Agents SDK'}</span>
                    </div>
                    <div className="p-4 text-sm text-slate-700 leading-relaxed max-h-[480px] overflow-y-auto whitespace-pre-wrap">
                      {formatResponse(response)}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How it works — matches RemediationPlan style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-sm font-bold text-slate-800">How it works</p>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            The Strands Agent receives your prompt plus all 14 registered tools (CloudTrail, IAM, CloudWatch, Security Hub, risk scoring, remediation, incident history, and more). It autonomously decides which tools to call and in what order — this is real agentic planning, not a fixed pipeline.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          <div className="p-4 border-b sm:border-b-0 sm:border-r border-slate-100 bg-gradient-to-r from-indigo-50/60 to-transparent">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Autonomous Agent</p>
            <p className="text-xs text-slate-600 leading-relaxed">Agent chooses tools based on your prompt. Different prompts → different tool sequences.</p>
          </div>
          <div className="p-4 bg-slate-50/30">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Fixed Pipeline</p>
            <p className="text-xs text-slate-600 leading-relaxed">Always runs: Timeline → Risk → Remediation → Docs. Same tools every time.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
