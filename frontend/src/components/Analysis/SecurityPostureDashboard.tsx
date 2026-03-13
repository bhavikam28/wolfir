/**
 * Security Posture Dashboard - Overview of analysis results
 * Health score, risk distribution, key metrics, top findings
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Activity,
  TrendingUp, ArrowUpRight, Target, Layers, ChevronDown, ChevronUp, DollarSign, ArrowRight, Link2, Sparkles, Loader2, Copy, Check, Gauge, Brain
} from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';
import { SLATracker, deriveSLACheckpoints } from './SLATracker';
import { analysisAPI } from '../../services/api';
import { healthCheck } from '../../services/api';

interface SecurityPostureDashboardProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  analysisTime?: number;
  incidentId?: string;
  onNavigateToCostImpact?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToIncidentHistory?: () => void;
  onNavigateToProtocol?: () => void;
  onNavigateToExport?: () => void;
  onNavigateToRemediation?: () => void;
}

// Demo fallback when backend is offline
const DEMO_WHAT_IF: Record<string, any> = {
  'What if MFA was required?': {
    original_scenario: 'IAM role with AdministratorAccess was created for a contractor and assumed by an attacker.',
    modified_scenario: 'With MFA required on the contractor role, the attacker could not have assumed it without the second factor. Initial access would have been blocked.',
    impact_changes: {
      blast_radius: 'Reduced to zero — no role assumption, no EC2 compromise.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: '~$2,400 crypto mining cost avoided',
      timeline_changes: ['AssumeRole would have failed', 'RunInstances would not have occurred', 'GuardDuty finding would not have been triggered'],
    },
    key_insight: 'MFA on IAM roles used by contractors would have prevented the entire incident.',
    preventive_controls: [
      { control: 'Enable MFA for IAM users with sensitive roles', effectiveness: 'Blocks credential reuse', aws_cli: 'aws iam enable-mfa-device --user-name contractor --serial-number arn:aws:iam::ACCOUNT:mfa/contractor --authentication-code1 123456 --authentication-code2 789012' },
    ],
  },
  'What if the role had least-privilege?': {
    original_scenario: 'contractor-temp had AdministratorAccess, enabling full account takeover.',
    modified_scenario: 'With scoped permissions (e.g. EC2 read-only), the attacker could not have launched instances or modified security groups.',
    impact_changes: {
      blast_radius: 'Limited to read-only reconnaissance; no resource abuse.',
      severity_change: 'CRITICAL → MEDIUM',
      cost_change: '~$2,400 avoided; only detection/remediation cost remains',
      timeline_changes: ['RunInstances would fail', 'AuthorizeSecurityGroupIngress would fail', 'Blast radius limited to metadata access'],
    },
    key_insight: 'Least-privilege on contractor roles limits blast radius even if credentials are compromised.',
    preventive_controls: [
      { control: 'Replace AdministratorAccess with scoped policies', effectiveness: 'Limits damage from compromised credentials', aws_cli: 'aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess' },
    ],
  },
  'What if GuardDuty was enabled sooner?': {
    original_scenario: 'GuardDuty detected crypto mining ~20 days after the attack started.',
    modified_scenario: 'With GuardDuty enabled and tuned, the RunInstances or unusual API patterns could have triggered alerts within hours.',
    impact_changes: {
      blast_radius: 'Same resources compromised, but detection time reduced from ~20 days to hours.',
      severity_change: 'No change to severity, but MTTR drastically reduced',
      cost_change: '~$2,000 saved (fewer days of unauthorized compute)',
      timeline_changes: ['GuardDuty finding would occur within 24h of RunInstances', 'Remediation could start before large-scale mining'],
    },
    key_insight: 'Earlier detection reduces cost and limits attacker dwell time.',
    preventive_controls: [
      { control: 'Enable GuardDuty in all regions', effectiveness: 'Detects crypto mining, credential abuse', aws_cli: 'aws guardduty create-detector --enable' },
    ],
  },
  'What if S3 bucket had block public access?': {
    original_scenario: 'S3 bucket allowed GetObject from external IP; data exfiltrated.',
    modified_scenario: 'Block public access would have prevented anonymous access; combined with scoped IAM, would limit exfiltration.',
    impact_changes: {
      blast_radius: 'Reduced — external IP access blocked.',
      severity_change: 'CRITICAL → HIGH (if IAM still permissive) or prevented',
      cost_change: 'Data breach costs avoided',
      timeline_changes: ['GetObject from 198.51.100.100 would fail', 'ListBucket might still work with valid credentials'],
    },
    key_insight: 'Block public access is a baseline control that prevents many S3 incidents.',
    preventive_controls: [
      { control: 'Enable S3 Block Public Access', effectiveness: 'Prevents public exposure', aws_cli: 'aws s3api put-public-access-block --bucket company-sensitive-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' },
    ],
  },
  'What if the trust policy restricted AssumeRole?': {
    original_scenario: 'AdminRole could be assumed by junior-dev without additional conditions.',
    modified_scenario: 'Trust policy with MFA or IP conditions would have blocked the assumption from unauthorized context.',
    impact_changes: {
      blast_radius: 'Privilege escalation prevented; backdoor-admin would not have been created.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: 'Full account compromise avoided',
      timeline_changes: ['AssumeRole would fail without MFA', 'CreateUser/AttachUserPolicy would not occur'],
    },
    key_insight: 'Restrictive trust policies on high-privilege roles prevent lateral movement.',
    preventive_controls: [
      { control: 'Add MFA condition to role trust policy', effectiveness: 'Requires second factor for assumption', aws_cli: 'aws iam update-assume-role-policy --role-name AdminRole --policy-document file://trust-policy-with-mfa.json' },
    ],
  },
  'What if credentials were rotated every 90 days?': {
    original_scenario: 'Compromised credentials were used to access secrets bucket.',
    modified_scenario: '90-day rotation would have limited the window; combined with anomaly detection, stale credentials might have been flagged.',
    impact_changes: {
      blast_radius: 'Same if credentials were recently stolen; rotation helps limit long-term exposure.',
      severity_change: 'No immediate change; reduces dwell time over months',
      cost_change: 'Reduces risk of prolonged unauthorized access',
      timeline_changes: ['If credentials were >90 days old, access would fail', 'Shorter validity reduces attacker window'],
    },
    key_insight: 'Credential rotation limits the impact window of stolen credentials.',
    preventive_controls: [
      { control: 'Enable IAM credential rotation', effectiveness: 'Limits exposure window', aws_cli: 'aws iam update-account-password-policy --minimum-password-age 1 --require-symbols --require-numbers' },
    ],
  },
};

const SecurityPostureDashboard: React.FC<SecurityPostureDashboardProps> = ({
  timeline,
  orchestrationResult,
  analysisTime: _analysisTime,
  onNavigateToCostImpact,
  onNavigateToTimeline,
  onNavigateToIncidentHistory,
  onNavigateToProtocol,
  onNavigateToExport,
  onNavigateToRemediation,
}) => {
  const metrics = useMemo(() => {
    const events = timeline?.events || [];
    const criticalCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL').length;
    const highCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'HIGH').length;
    const mediumCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'MEDIUM').length;
    const lowCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'LOW').length;
    const totalEvents = events.length;
    const confidence = timeline?.confidence || 0;

    // Health score: severity distribution (industry-standard), not event-count ratio.
    // Treat unclassified events as MEDIUM. Fewer events = no artificial inflation.
    const classified = criticalCount + highCount + mediumCount + lowCount;
    const unclassifiedAsMedium = totalEvents - classified;
    const effMedium = mediumCount + unclassifiedAsMedium;
    const total = totalEvents || 1;
    const pCrit = criticalCount / total;
    const pHigh = highCount / total;
    const pMed = effMedium / total;
    const pLow = lowCount / total;
    const riskScore = pCrit * 40 + pHigh * 25 + pMed * 10 + pLow * 3;
    const healthScore = totalEvents > 0 ? Math.max(5, Math.round(100 - (riskScore / 40) * 100)) : 50;

    // Risk scores from orchestration
    const riskScores = orchestrationResult?.results?.risk_scores || [];
    // Convert risk_level string to numeric score (backend returns { risk: { risk_level, confidence } })
    const riskLevelToScore = (level: string): number => {
      switch ((level || '').toUpperCase()) {
        case 'CRITICAL': return 95;
        case 'HIGH': return 75;
        case 'MEDIUM': return 50;
        case 'LOW': return 25;
        default: return 0;
      }
    };
    const avgRiskScore = riskScores.length > 0
      ? Math.round(riskScores.reduce((sum: number, r: any) => {
          // Support both shapes: { risk_score: number } (demo) and { risk: { risk_level, confidence } } (real)
          if (typeof r.risk_score === 'number') return sum + r.risk_score;
          if (r.risk?.risk_level) return sum + riskLevelToScore(r.risk.risk_level);
          if (r.risk?.severity) return sum + riskLevelToScore(r.risk.severity);
          return sum;
        }, 0) / riskScores.length)
      : Math.max(30, Math.round(100 - healthScore + 15));

    return {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalEvents,
      confidence,
      healthScore,
      avgRiskScore,
      riskScores,
    };
  }, [timeline, orchestrationResult]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Good' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-200', label: 'Fair' };
    if (score >= 40) return { text: 'text-orange-600', bg: 'bg-orange-500', ring: 'ring-orange-200', label: 'At Risk' };
    return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200', label: 'Critical' };
  };

  const healthConfig = getHealthColor(metrics.healthScore);

  const [showMethodology, setShowMethodology] = useState(true);
  const [showWhatIf, setShowWhatIf] = useState(true); // Expanded by default for visibility
  const [whatIfQuestion, setWhatIfQuestion] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfCopiedId, setWhatIfCopiedId] = useState<string | null>(null);

  const incidentType = useMemo(() => {
    const type = (orchestrationResult?.metadata as any)?.incident_type || '';
    const rc = (timeline?.root_cause || '').toLowerCase();
    const ap = (timeline?.attack_pattern || '').toLowerCase();
    if (/crypto|mining|miner/.test(type + rc + ap)) return 'crypto-mining';
    if (/exfil|data|s3|getobject|bucket/.test(type + rc + ap)) return 'data-exfiltration';
    if (/privilege|escalat|assumerole|admin/.test(type + rc + ap)) return 'privilege-escalation';
    if (/unauthorized|external|credential|stolen/.test(type + rc + ap)) return 'unauthorized-access';
    return 'crypto-mining'; // default for demo
  }, [timeline, orchestrationResult]);

  const suggestedQuestions = useMemo(() => {
    const byType: Record<string, string[]> = {
      'crypto-mining': ['What if MFA was required?', 'What if the role had least-privilege?', 'What if GuardDuty was enabled sooner?'],
      'data-exfiltration': ['What if S3 bucket had block public access?', 'What if the user\'s permissions were scoped?'],
      'privilege-escalation': ['What if the trust policy restricted AssumeRole?', 'What if MFA was required?'],
      'unauthorized-access': ['What if credentials were rotated every 90 days?', 'What if IP-based conditions were on the role?'],
    };
    return byType[incidentType] || byType['crypto-mining'];
  }, [incidentType]);

  const timelineJson = useMemo(() => JSON.stringify({
    root_cause: timeline?.root_cause,
    attack_pattern: timeline?.attack_pattern,
    blast_radius: timeline?.blast_radius,
    events: (timeline?.events || []).slice(0, 15).map(e => ({ action: e.action, resource: e.resource, severity: e.severity })),
  }), [timeline]);

  const runWhatIf = async (q: string) => {
    const question = q || whatIfQuestion;
    if (!question.trim()) return;
    setWhatIfLoading(true);
    setWhatIfResult(null);
    try {
      const backendOk = await healthCheck();
      if (backendOk) {
        const result = await analysisAPI.whatIf(question, timelineJson, incidentType);
        setWhatIfResult(result);
      } else {
        const demo = DEMO_WHAT_IF[question] || DEMO_WHAT_IF[suggestedQuestions[0]];
        if (demo) {
          setWhatIfResult({ ...demo, model_used: 'Nova 2 Lite (Demo)' });
        } else {
          setWhatIfResult(DEMO_WHAT_IF['What if MFA was required?']);
        }
      }
    } catch {
      const demo = DEMO_WHAT_IF[question] || DEMO_WHAT_IF[suggestedQuestions[0]] || DEMO_WHAT_IF['What if MFA was required?'];
      setWhatIfResult({ ...demo, model_used: 'Nova 2 Lite (Demo)' });
    } finally {
      setWhatIfLoading(false);
    }
  };

  const copyCli = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setWhatIfCopiedId(id);
    setTimeout(() => setWhatIfCopiedId(null), 2000);
  };

  const isBlank = (val: string | undefined): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return lower === 'unknown' || lower === '' || lower.includes('failed to parse') || lower.includes('no json found');
  };

  const rootCause = isBlank(timeline?.root_cause) ? 'Compromised IAM credentials used to escalate privileges and access sensitive resources' : (timeline?.root_cause ?? '');
  const attackPattern = isBlank(timeline?.attack_pattern) ? 'Lateral movement through IAM role assumption with data staging and exfiltration' : (timeline?.attack_pattern ?? '');
  const blastRadius = isBlank(timeline?.blast_radius) ? 'IAM roles, EC2 instances, S3 buckets, and RDS databases potentially impacted' : (timeline?.blast_radius ?? '');

  const pieData = useMemo(() => {
    const d = [
      { name: 'Critical', value: metrics.criticalCount, color: '#ef4444' },
      { name: 'High', value: metrics.highCount, color: '#f97316' },
      { name: 'Medium', value: metrics.mediumCount, color: '#eab308' },
      { name: 'Low', value: metrics.lowCount, color: '#22c55e' },
    ].filter(x => x.value > 0);
    return d.length ? d : [{ name: 'No data', value: 1, color: '#e2e8f0' }];
  }, [metrics.criticalCount, metrics.highCount, metrics.mediumCount, metrics.lowCount]);

  return (
    <div className="space-y-6">
      {/* Key Findings — single source of truth (Root Cause, Attack Pattern, Blast Radius) */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incident Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KeyFindingCard
            id="root-cause"
            title="Root Cause"
            subtitle="Initial attack vector"
            text={rootCause}
            icon={Target as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-red-500"
            iconBg="bg-red-100"
            iconColor="text-red-600"
            borderColor="border-l-red-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const rc = events.filter(e => /CreateRole|AttachRolePolicy|AssumeRole|CreatePolicyVersion|PutCredentials|StartEnvironment|CreateSession/i.test(e.action || ''));
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return (rc.length ? rc : ch).slice(0, 5);
            }}
          />
          <KeyFindingCard
            id="attack-pattern"
            title="Attack Pattern"
            subtitle="Kill chain stages"
            text={attackPattern}
            icon={Activity as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-orange-500"
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            borderColor="border-l-orange-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const ap = events.filter(e => /AuthorizeSecurityGroup|RunInstances|CreateAccessKey|GuardDuty|CreatePolicyVersion|DeleteSession|PutCredentials|CreateSession/i.test(e.action || ''));
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return (ap.length ? ap : ch).slice(0, 5);
            }}
          />
          <KeyFindingCard
            id="blast-radius"
            title="Blast Radius"
            subtitle={`${metrics.totalEvents} events, ${metrics.criticalCount} critical`}
            text={blastRadius}
            icon={Layers as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-violet-500"
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            borderColor="border-l-violet-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return ch.slice(0, 5);
            }}
          />
        </div>
      </section>

      {/* What If — Scenario Simulation (AI-Powered Tabletop Exercise) */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scenario Simulation</h2>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-100 overflow-hidden">
          <button
            onClick={() => setShowWhatIf(!showWhatIf)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-violet-50/40 transition-colors border-b border-slate-100 bg-gradient-to-r from-violet-50/30 to-transparent"
          >
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            What If — Scenario Simulation
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">AI-Powered Tabletop Exercise</span>
          </span>
          {showWhatIf ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showWhatIf && (
          <div className="p-4 space-y-4">
            <input
              type="text"
              placeholder="What if MFA was enabled on all users?"
              value={whatIfQuestion}
              onChange={(e) => setWhatIfQuestion(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setWhatIfQuestion(q); runWhatIf(q); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={() => runWhatIf(whatIfQuestion)}
              disabled={whatIfLoading || !whatIfQuestion.trim()}
              className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {whatIfLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating...</> : <><Sparkles className="w-4 h-4" /> Simulate</>}
            </button>

            <AnimatePresence>
              {whatIfResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pt-4 border-t border-slate-200 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Actual Scenario</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{whatIfResult.original_scenario}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
                      <h4 className="text-xs font-bold text-violet-600 uppercase mb-2">Modified Scenario</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{whatIfResult.modified_scenario}</p>
                    </div>
                  </div>
                  {whatIfResult.impact_changes && (
                    <div className="flex flex-wrap gap-2">
                      {whatIfResult.impact_changes.severity_change && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          (whatIfResult.impact_changes.severity_change || '').includes('prevented') || (whatIfResult.impact_changes.severity_change || '').includes('reduced')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : (whatIfResult.impact_changes.severity_change || '').toLowerCase().includes('no change')
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          Severity: {whatIfResult.impact_changes.severity_change}
                        </span>
                      )}
                      {whatIfResult.impact_changes.cost_change && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Cost: {whatIfResult.impact_changes.cost_change}
                        </span>
                      )}
                      {whatIfResult.impact_changes.blast_radius && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          (whatIfResult.impact_changes.blast_radius || '').toLowerCase().includes('reduced') || (whatIfResult.impact_changes.blast_radius || '').toLowerCase().includes('zero')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : (whatIfResult.impact_changes.blast_radius || '').toLowerCase().includes('same')
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          Blast radius: {whatIfResult.impact_changes.blast_radius}
                        </span>
                      )}
                    </div>
                  )}
                  {whatIfResult.key_insight && (
                    <p className="text-sm font-semibold text-violet-700 bg-violet-50 px-3 py-2 rounded-lg border border-violet-200">
                      {whatIfResult.key_insight}
                    </p>
                  )}
                  {whatIfResult.preventive_controls && whatIfResult.preventive_controls.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-600">Preventive Controls</h5>
                      {whatIfResult.preventive_controls.map((pc: any, i: number) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-800">{pc.control}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{pc.effectiveness}</p>
                          {pc.aws_cli && (
                            <div className="flex items-start gap-2 mt-2">
                              <pre className="flex-1 p-2 text-xs font-mono bg-slate-900 text-slate-100 rounded overflow-x-auto">{pc.aws_cli}</pre>
                              <button onClick={() => copyCli(pc.aws_cli, `cli-${i}`)} className="p-2 rounded bg-slate-200 hover:bg-slate-300">
                                {whatIfCopiedId === `cli-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      </section>

      {/* Cross-Incident Correlation */}
      {orchestrationResult?.results?.correlation && orchestrationResult.results.correlation.campaign_probability > 0.5 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">
                Cross-Incident Correlation Detected
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {Math.round((orchestrationResult.results.correlation.campaign_probability) * 100)}% probability this is a coordinated campaign.
              </p>
              {orchestrationResult.results.correlation.correlation_summary && (
                <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">
                  {orchestrationResult.results.correlation.correlation_summary}
                </p>
              )}
              <p className="text-[10px] text-amber-600 mt-1">Ask Aria: &quot;Have we seen this attack before?&quot;</p>
            </div>
            {onNavigateToIncidentHistory && (
              <button
                onClick={onNavigateToIncidentHistory}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg transition-colors"
              >
                View similar incidents →
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick actions — surface key features */}
      {(onNavigateToIncidentHistory || onNavigateToProtocol || onNavigateToExport || onNavigateToRemediation) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-semibold text-slate-600 mr-1">Explore:</span>
          {onNavigateToIncidentHistory && (
            <button onClick={onNavigateToIncidentHistory} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
              Similar incidents
            </button>
          )}
          {onNavigateToProtocol && (
            <button onClick={onNavigateToProtocol} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
              IR Protocol (NIST)
            </button>
          )}
          {onNavigateToRemediation && (
            <button onClick={onNavigateToRemediation} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
              Remediation + Nova Act
            </button>
          )}
          {onNavigateToExport && (
            <button onClick={onNavigateToExport} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">
              Export report
            </button>
          )}
        </motion.div>
      )}

      {/* Health & Metrics — Premium dashboard with gauges */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Security Posture</h2>
        <div className="grid lg:grid-cols-4 gap-5">
        {/* Security Health — Gauge 1 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-6 flex flex-col items-center justify-center ring-1 ring-white/50"
        >
          <p className="text-xs font-semibold text-slate-600 tracking-wide mb-4">Security Health</p>
          <div className="relative">
            <svg className="w-32 h-32" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={metrics.healthScore >= 80 ? '#34d399' : metrics.healthScore >= 60 ? '#fbbf24' : metrics.healthScore >= 40 ? '#fb923c' : '#f87171'} />
                  <stop offset="100%" stopColor={metrics.healthScore >= 80 ? '#10b981' : metrics.healthScore >= 60 ? '#f59e0b' : metrics.healthScore >= 40 ? '#f97316' : '#ef4444'} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx={60}
                cy={60}
                r={52}
                fill="none"
                stroke="url(#healthGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(metrics.healthScore / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-extrabold tracking-tight ${healthConfig.text}`}>{metrics.healthScore}</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">{healthConfig.label}</span>
            </div>
          </div>
        </motion.div>

        {/* Avg Risk Score — Gauge 2 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-1 bg-gradient-to-b from-white to-violet-50/30 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-6 flex flex-col items-center justify-center ring-1 ring-white/50"
        >
          <p className="text-xs font-semibold text-slate-600 tracking-wide mb-4">Risk Score</p>
          <div className="relative">
            <svg className="w-28 h-28" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={metrics.avgRiskScore >= 75 ? '#f87171' : metrics.avgRiskScore >= 50 ? '#fb923c' : '#22c55e'} />
                  <stop offset="100%" stopColor={metrics.avgRiskScore >= 75 ? '#ef4444' : metrics.avgRiskScore >= 50 ? '#f59e0b' : '#10b981'} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              <circle
                cx={60}
                cy={60}
                r={46}
                fill="none"
                stroke="url(#riskGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(metrics.avgRiskScore / 100) * 289} 289`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold tracking-tight ${metrics.avgRiskScore >= 75 ? 'text-red-600' : metrics.avgRiskScore >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {metrics.avgRiskScore}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">/ 100</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics — security-relevant only */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            {
              label: 'Events Analyzed',
              value: metrics.totalEvents,
              icon: Activity as React.ComponentType<{ className?: string; strokeWidth?: number }>,
              color: 'text-indigo-600',
              bg: 'bg-indigo-100',
              trend: null,
              suffix: undefined as string | undefined,
            },
            {
              label: 'AI Confidence',
              value: `${(metrics.confidence * 100).toFixed(0)}%`,
              icon: TrendingUp as React.ComponentType<{ className?: string; strokeWidth?: number }>,
              color: 'text-emerald-600',
              bg: 'bg-emerald-100',
              trend: null,
              suffix: undefined as string | undefined,
            },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-md shadow-slate-100 hover:shadow-lg hover:border-slate-300/80 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 tracking-wide">{metric.label}</span>
                <div className={`w-9 h-9 rounded-xl ${metric.bg} flex items-center justify-center border border-slate-100`}>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-2xl font-extrabold text-slate-800 tracking-tight">{metric.value}</span>
                {metric.suffix && <span className="text-sm font-medium text-slate-500 mb-0.5">{metric.suffix}</span>}
              </div>
              {metric.trend === 'high' && (
                <div className="flex items-center gap-1.5 mt-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-600">Elevated risk</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        </div>

        {/* How we calculate — right after Security Posture */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-700">How we calculate these numbers</span>
            {showMethodology ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {showMethodology && (
            <div className="px-5 pb-5 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <Gauge className="w-5 h-5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Security Health</h4>
                    <p className="text-xs text-slate-600 mb-3">Weighted by severity. Higher score = healthier posture.</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Critical 40</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">High 25</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Medium 10</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Low 3</span>
                    </div>
                    <code className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">100 − (avg ÷ 40)×100</code>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Risk Score</h4>
                    <p className="text-xs text-slate-600 mb-3">Each severity maps to a numeric score. Mean of all events.</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">CRITICAL→95</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">HIGH→75</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">MEDIUM→50</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">LOW→25</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">AI Confidence</h4>
                    <p className="text-xs text-slate-600">TemporalAgent outputs 0–1 based on event coverage and correlation strength. Higher = more reliable analysis.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Events Analyzed</h4>
                    <p className="text-xs text-slate-600">CloudTrail events from this analysis, grouped by severity in the Risk Distribution below.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Risk Distribution — compact chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-700 tracking-wide">Risk Distribution</h3>
          <span className="text-xs font-medium text-slate-500">{metrics.totalEvents} events</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">CloudTrail events by severity. Click to view in Timeline.</p>
        <div className="h-36 flex items-center gap-4">
          <div className="w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={800}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} events`, '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                labelStyle={{ fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 flex-1">
          {[
            { label: 'Critical', count: metrics.criticalCount, color: '#ef4444' },
            { label: 'High', count: metrics.highCount, color: '#f97316' },
            { label: 'Medium', count: metrics.mediumCount, color: '#eab308' },
            { label: 'Low', count: metrics.lowCount, color: '#22c55e' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={onNavigateToTimeline}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors group"
              title={`View ${item.count} ${item.label} events in Timeline`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">{item.label}</span>
              <span className="text-xs font-bold text-slate-800 tabular-nums group-hover:text-slate-900">{item.count}</span>
            </button>
          ))}
          </div>
        </div>
        {onNavigateToTimeline && (
          <button
            onClick={onNavigateToTimeline}
            className="mt-4 w-full flex items-center justify-between gap-4 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center">
                <Activity className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">View events in Timeline</h4>
                <p className="text-xs text-slate-500">See full CloudTrail events with timestamps and actions</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </motion.div>

      {/* Incident Response SLA — moved below key sections for better flow */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Incident Response SLA</h2>
        <SLATracker
          checkpoints={deriveSLACheckpoints(
            orchestrationResult?.analysis_time_ms ?? 0,
            !!orchestrationResult?.results?.remediation_plan,
            !!orchestrationResult?.results?.documentation
          )}
          compact
        />
      </section>

      {/* Cost Impact CTA */}
      {onNavigateToCostImpact && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-indigo-50/60 p-4"
        >
          <button
            onClick={onNavigateToCostImpact}
            className="w-full flex items-center justify-between gap-4 text-left hover:bg-white/60 rounded-lg p-3 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">What's the business impact?</h4>
                <p className="text-xs text-slate-500">View cost exposure &amp; wolfir savings</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      )}

    </div>
  );
};

/** Unified Key Finding card: summary + expandable supporting evidence */
function KeyFindingCard({
  id: _id,
  title,
  subtitle,
  text,
  icon: Icon,
  accent,
  iconBg,
  iconColor,
  borderColor: _borderColor,
  timeline,
  getSupportingEvents,
}: {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  timeline: Timeline;
  getSupportingEvents: (events: Array<{ action?: string; resource?: string; severity?: string; timestamp?: string }>) => Array<{ action?: string; resource?: string; severity?: string; timestamp?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = timeline?.events || [];
  const supportingEvents = getSupportingEvents(events);

  const formatResource = (r: string) =>
    (r || '').replace(/Environment\s+[a-f0-9-]{36}/gi, 'Bedrock Environment').replace(/Session\s+[\d-]+[a-z0-9]+/gi, 'Bedrock Session');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`h-0.5 ${accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center border border-slate-200`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
              <p className="text-[10px] text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        {supportingEvents.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} supporting evidence ({supportingEvents.length})
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && supportingEvents.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
          >
            <div className="p-4 pt-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">CloudTrail events</p>
              <ul className="space-y-1.5">
                {supportingEvents.map((e, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2 font-mono">
                    <span className="text-slate-400 shrink-0">{e.timestamp?.slice(0, 16) || '—'}</span>
                    <span>{e.action} → {formatResource(e.resource || '')} ({e.severity})</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SecurityPostureDashboard;
