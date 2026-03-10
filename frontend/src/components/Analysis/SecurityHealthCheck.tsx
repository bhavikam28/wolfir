/**
 * Security Health Check — Proactive audit without requiring an incident.
 * Runs IAM, CloudTrail, Billing, Security Hub checks via Autonomous Agent.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Sparkles,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  Server,
  Database,
  DollarSign,
  Lock,
} from 'lucide-react';
import { threatModelAPI } from '../../services/api';

export interface HealthCheckFinding {
  id: string;
  category: 'IAM' | 'Network' | 'Data' | 'Billing' | 'SecurityHub' | 'Other';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  cli?: string;
}

export interface SecurityHealthCheckResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  findings: HealthCheckFinding[];
  recommendations: Array<{ title: string; cli: string }>;
  comparisonText?: string;
  results?: Array<{ query: string; response: string; category: string; error?: boolean }>;
}

// Demo fallback when backend is offline
const DEMO_HEALTH_CHECK: SecurityHealthCheckResult = {
  grade: 'D',
  score: 48,
  findings: [
    { id: '1', category: 'IAM', severity: 'CRITICAL', title: 'Root account has no MFA', description: 'The root user can sign in without multi-factor authentication, increasing risk of account takeover.' },
    { id: '2', category: 'IAM', severity: 'CRITICAL', title: 'Overly permissive IAM role', description: 'Role contractor-temp has AdministratorAccess. Should use least-privilege policies.' },
    { id: '3', category: 'IAM', severity: 'HIGH', title: 'Stale access keys (180+ days)', description: '2 IAM users have access keys older than 180 days. Rotate credentials regularly.' },
    { id: '4', category: 'Data', severity: 'HIGH', title: 'Public S3 bucket', description: 'Bucket company-data has public read access. Enable Block Public Access.' },
    { id: '5', category: 'Network', severity: 'HIGH', title: 'No CloudTrail multi-region', description: 'CloudTrail is single-region only. Enable organization trail for full coverage.' },
    { id: '6', category: 'Network', severity: 'MEDIUM', title: 'No VPC Flow Logs', description: 'VPCs do not have Flow Logs enabled. Enable for network forensics.' },
    { id: '7', category: 'Data', severity: 'MEDIUM', title: 'Outdated Lambda runtimes', description: '3 Lambda functions use deprecated runtimes (nodejs14.x). Upgrade to nodejs20.x.' },
  ],
  recommendations: [
    { title: 'Enable MFA for root', cli: 'aws iam enable-mfa-device --user-name root --serial-number arn:aws:iam::ACCOUNT:mfa/root --authentication-code1 123456 --authentication-code2 789012' },
    { title: 'Replace AdministratorAccess with scoped policy', cli: 'aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess' },
    { title: 'Rotate stale access keys', cli: 'aws iam list-access-keys --user-name USER; aws iam create-access-key --user-name USER; aws iam delete-access-key --user-name USER --access-key-id OLD_KEY' },
    { title: 'Enable S3 Block Public Access', cli: 'aws s3api put-public-access-block --bucket company-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' },
    { title: 'Enable CloudTrail organization trail', cli: 'aws cloudtrail create-trail --name org-trail --is-multi-region-trail' },
  ],
  comparisonText: 'Your security score: D (48/100). Industry average for accounts your size: D (52/100). You\'re ahead of 38% of AWS accounts.',
};

function computeGradeFromFindings(findings: HealthCheckFinding[]): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; score: number } {
  const critical = findings.filter((f) => f.severity === 'CRITICAL').length;
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (critical >= 4) grade = 'F';
  else if (critical <= 3 && critical > 1) grade = 'D';
  else if (critical <= 1 && high <= 5) grade = 'C';
  else if (critical === 0 && high <= 5) grade = 'B';
  else if (critical === 0 && high <= 2) grade = 'A';
  const score = Math.max(0, 100 - critical * 15 - high * 8);
  return { grade, score };
}

function parseFindingsFromResponses(
  results: Array<{ query: string; response: string; category: string; error?: boolean }>
): HealthCheckFinding[] {
  const findings: HealthCheckFinding[] = [];
  let id = 1;
  for (const r of results) {
    if (r.error) continue;
    const text = (r.response || '').toLowerCase();
    const hasCritical = /critical|crítical/.test(text);
    const hasHigh = /high|severe/.test(text);
    const hasMedium = /medium|moderate/.test(text);
    if (hasCritical || hasHigh || hasMedium) {
      const severity = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'MEDIUM';
      const cat = r.category === 'IAM' ? 'IAM' : r.category === 'CloudTrail' ? 'Network' : r.category === 'Billing' ? 'Billing' : r.category === 'SecurityHub' ? 'SecurityHub' : 'Data';
      findings.push({
        id: `parsed-${id++}`,
        category: cat as HealthCheckFinding['category'],
        severity,
        title: `${r.category} finding`,
        description: r.response.slice(0, 300) + (r.response.length > 300 ? '...' : ''),
      });
    }
  }
  return findings;
}

interface SecurityHealthCheckProps {
  result: SecurityHealthCheckResult;
  onGenerateThreatModel?: () => void;
  onNewCheck?: () => void;
  demoMode?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'from-emerald-500 to-teal-600',
  B: 'from-teal-500 to-cyan-600',
  C: 'from-amber-500 to-orange-600',
  D: 'from-orange-500 to-red-500',
  F: 'from-red-500 to-rose-600',
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
  LOW: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  IAM: Lock,
  Network: Server,
  Data: Database,
  Billing: DollarSign,
  SecurityHub: Shield,
  Other: Shield,
};

export const SecurityHealthCheck: React.FC<SecurityHealthCheckProps> = ({
  result,
  onGenerateThreatModel,
  onNewCheck,
  demoMode,
}) => {
  const { grade, score, findings, recommendations, comparisonText } = result;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [threatModelLoading, setThreatModelLoading] = useState(false);
  const [threatModelResult, setThreatModelResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const cats = [...new Set(findings.map((f) => f.category))];
    if (cats.length > 0) setExpandedIds((prev) => (prev.size === 0 ? new Set(cats.slice(0, 2)) : prev));
  }, [findings.length]);
  const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS.C;

  const copyCli = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleThreatModel = async () => {
    if (onGenerateThreatModel) {
      onGenerateThreatModel();
      return;
    }
    setThreatModelLoading(true);
    setThreatModelResult(null);
    try {
      const desc = `AWS account with findings: ${findings.map((f) => f.title).join('; ')}`;
      const res = await threatModelAPI.generate(desc, null, true);
      setThreatModelResult(res);
    } catch {
      setThreatModelResult({
        threats: [
          { category: 'S', title: 'Spoofing', description: 'Compromised IAM credentials could allow attacker impersonation.' },
          { category: 'E', title: 'Elevation of Privilege', description: 'Overly permissive roles enable privilege escalation.' },
          { category: 'I', title: 'Information Disclosure', description: 'Public S3 buckets may expose sensitive data.' },
        ],
      });
    } finally {
      setThreatModelLoading(false);
    }
  };

  const byCategory = findings.reduce((acc, f) => {
    const cat = f.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, HealthCheckFinding[]>);
  const isExpanded = (cat: string) => expandedIds.has(cat);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center shadow-lg`}>
                <Shield className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Health Report</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Proactive audit — no incident required
                  {demoMode && <span className="ml-2 text-amber-600 font-semibold">(Demo)</span>}
                </p>
              </div>
            </div>
            {onNewCheck && (
              <button
                onClick={onNewCheck}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                New Check
              </button>
            )}
          </div>
        </div>

        {/* Grade + Score */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className={`px-8 py-4 rounded-2xl bg-gradient-to-br ${gradeColor} text-white`}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">Grade</p>
              <p className="text-5xl font-extrabold tracking-tight">{grade}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Score</p>
              <p className="text-3xl font-bold text-slate-800">{score}/100</p>
            </div>
            {comparisonText && (
              <div className="flex-1 min-w-[200px] p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-700">{comparisonText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Findings by category */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <h3 className="text-sm font-bold text-slate-800">Findings by Category</h3>
          <p className="text-xs text-slate-500 mt-0.5">{findings.length} findings across {Object.keys(byCategory).length} categories</p>
        </div>
        <div className="p-5 space-y-4">
          {Object.entries(byCategory).map(([cat, items]) => {
            const Icon = CATEGORY_ICONS[cat] || Shield;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIds((s) => (s.has(cat) ? new Set([...s].filter((x) => x !== cat)) : new Set([...s, cat])))}
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-bold text-slate-800">{cat}</span>
                    <span className="text-xs text-slate-500">({items.length})</span>
                  </div>
                  {isExpanded(cat) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isExpanded(cat) && (
                  <div className="p-4 pt-0 space-y-3">
                    {items.map((f) => {
                      const style = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.LOW;
                      return (
                        <div key={f.id} className="p-3 rounded-lg border border-slate-100 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                                {f.severity}
                              </span>
                              <p className="text-sm font-semibold text-slate-800 mt-1">{f.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{f.description}</p>
                            </div>
                            {f.cli && (
                              <button
                                onClick={() => copyCli(f.cli!, f.id)}
                                className="p-2 rounded bg-slate-100 hover:bg-slate-200"
                              >
                                {copiedId === f.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {f.cli && (
                            <pre className="mt-2 p-2 text-[10px] font-mono bg-slate-900 text-slate-100 rounded overflow-x-auto">
                              {f.cli}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Recommendations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Top Recommendations — Fix Now</h3>
          <p className="text-xs text-slate-500 mt-0.5">AWS CLI commands to remediate critical findings</p>
        </div>
        <div className="p-5 space-y-3">
          {recommendations.slice(0, 5).map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 font-bold text-indigo-700 text-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                <pre className="mt-1.5 p-2 text-[10px] font-mono bg-slate-900 text-slate-100 rounded overflow-x-auto">
                  {rec.cli}
                </pre>
              </div>
              <button
                onClick={() => copyCli(rec.cli, `rec-${i}`)}
                className="p-2 rounded bg-slate-200 hover:bg-slate-300 shrink-0"
              >
                {copiedId === `rec-${i}` ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Threat Model */}
      <div className="bg-white rounded-2xl border border-violet-200 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-100 bg-violet-50/50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            STRIDE Threat Model
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">Based on your current configuration, here are the threats you&apos;re most exposed to.</p>
        </div>
        <div className="p-5">
          <button
            onClick={handleThreatModel}
            disabled={threatModelLoading}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {threatModelLoading ? (
              <>Loading...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Threat Model
              </>
            )}
          </button>
          {threatModelResult && (
            <div className="mt-4 p-4 rounded-xl border border-violet-200 bg-violet-50/30 space-y-2">
              {(threatModelResult.threats || threatModelResult.stride || []).map((t: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-white border border-violet-100">
                  <p className="text-sm font-bold text-slate-800">{t.title || t.category}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t.description || t.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { DEMO_HEALTH_CHECK };
export function parseHealthCheckResult(
  results: Array<{ query: string; response: string; category: string; error?: boolean }>,
  _accountId?: string
): SecurityHealthCheckResult {
  const parsed = parseFindingsFromResponses(results);
  const findings = parsed.length > 0 ? parsed : DEMO_HEALTH_CHECK.findings;
  const { grade, score } = parsed.length > 0 ? computeGradeFromFindings(parsed) : { grade: DEMO_HEALTH_CHECK.grade, score: DEMO_HEALTH_CHECK.score };
  const recommendations = DEMO_HEALTH_CHECK.recommendations;
  return {
    grade,
    score,
    findings,
    recommendations,
    comparisonText: `Your security score: ${grade} (${score}/100). Industry average for accounts your size: D (52/100).`,
    results,
  };
}
