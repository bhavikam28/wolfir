/**
 * Remediation Plan - Step-by-step plan with expandable details and approval flow
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, AlertTriangle, ChevronDown,
  ChevronUp, Play, Clock, Terminal, Copy, Brain, FileText, Zap, ExternalLink,
  BookOpen, Lock, Circle, Loader2, XCircle, RotateCcw, Bot, MousePointerClick
} from 'lucide-react';
import { remediationAPI, novaActAPI, rubricAPI, healthCheck } from '../../services/api';

function ProofCloudTrail({ event }: { event: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-slate-400 hover:text-emerald-400 text-[10px] font-bold flex items-center gap-1"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide CloudTrail Event' : 'Show CloudTrail Event'}
      </button>
      {expanded && (
        <pre className="mt-1 text-[10px] text-slate-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

interface RemediationStep {
  step: number;
  action: string;
  target: string;
  reason: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  api_call?: string;
}

interface RemediationPlanData {
  plan: RemediationStep[];
  priority: string;
  estimated_time?: string;
  rollback_plan?: string;
}

interface RemediationPlanProps {
  plan: RemediationPlanData | any;
  incidentId?: string;
  incidentType?: string;
  rootCause?: string;
  affectedResources?: string[];
  demoMode?: boolean;
  onApprove?: (plan: RemediationPlanData) => void;
  onExecute?: (stepIndex: number) => void;
  executing?: boolean;
  /** Navigate to another feature (e.g. AI Compliance when AI incident) */
  onNavigateToFeature?: (featureId: string) => void;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** Detect AI-related incidents (Bedrock, prompt injection, bias, LLM, shadow AI) */
function isAIIncident(incidentType?: string, rootCause?: string): boolean {
  const text = `${incidentType || ''} ${rootCause || ''}`.toLowerCase();
  return /bedrock|prompt injection|bias|llm|shadow ai|model drift|hallucination|jailbreak|ai security/i.test(text);
}

/** AI-specific remediation steps injected when incident is AI-related */
const AI_INCIDENT_STEPS = [
  { order: 1, action: 'Validate Bedrock Guardrails configuration', target: 'Bedrock Guardrails', reason: 'Ensure guardrails were not bypassed. Check content filters, PII redaction, and denied topics.', risk: 'HIGH' as const, classification: 'APPROVAL' as const, api_call: 'aws bedrock get-guardrail --guardrail-identifier <id> --guardrail-version <ver> --region us-east-1' },
  { order: 2, action: 'Run bias assessment on affected model outputs', target: 'Bedrock model / inference logs', reason: 'AI incidents may involve discriminatory or biased outputs. Assess fairness metrics before remediation.', risk: 'HIGH' as const, classification: 'APPROVAL' as const, api_call: 'aws bedrock list-foundation-models --region us-east-1' },
  { order: 3, action: 'Check regulatory escalation (EU AI Act, etc.)', target: 'Compliance team', reason: 'High-risk AI systems may require notification to regulators under EU AI Act or similar frameworks.', risk: 'MEDIUM' as const, classification: 'MANUAL' as const },
  { order: 4, action: 'Recommend model retraining or validation', target: 'MLOps / Model registry', reason: 'If bias or prompt injection was exploited, validate or retrain the model with updated guardrails.', risk: 'MEDIUM' as const, classification: 'MANUAL' as const },
];

const RemediationPlan: React.FC<RemediationPlanProps> = ({
  plan, incidentId, incidentType = 'Security Incident', rootCause = 'Unknown', affectedResources = [], demoMode = false,
  onApprove, onExecute, executing = false, onNavigateToFeature
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [approved, setApproved] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  const [stepProofs, setStepProofs] = useState<Record<number, any>>({});
  const [novaActPlan, setNovaActPlan] = useState<any>(null);
  const [novaActLoading, setNovaActLoading] = useState(false);
  const [novaActExpanded, setNovaActExpanded] = useState(false);
  const [rubricScore, setRubricScore] = useState<{ overall_score: number; summary: string } | null>(null);
  const [rubricLoading, setRubricLoading] = useState(false);
  const [rollbackExpanded, setRollbackExpanded] = useState(false);

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    newExpanded.has(step) ? newExpanded.delete(step) : newExpanded.add(step);
    setExpandedSteps(newExpanded);
  };

  const handleApprove = () => {
    setApproved(true);
    onApprove?.(plan);
  };

  const getRiskStyles = (risk: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
      HIGH: 'bg-red-50 text-red-700 border-red-200',
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    };
    return styles[risk.toUpperCase()] || styles.MEDIUM;
  };

  const getPriorityStyles = (priority: string) => {
    const styles: Record<string, string> = {
      IMMEDIATE: 'bg-red-100 text-red-700 border-red-300',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
    };
    return styles[priority.toUpperCase()] || 'bg-blue-100 text-blue-700 border-blue-300';
  };

  // Parse the plan data structure
  let steps: any[] = [];
  let priority = 'MEDIUM';
  let estimatedTime: string | undefined;
  let rollbackPlan: string | undefined;
  let impactAssessment: { resources_affected?: number; iam_policies_to_modify?: number } = {};

  if (plan) {
    if (plan.plan) {
      if (Array.isArray(plan.plan.plan)) { steps = plan.plan.plan; priority = plan.plan.priority || 'MEDIUM'; estimatedTime = plan.plan.estimated_time; rollbackPlan = plan.plan.rollback_plan; impactAssessment = plan.plan.impact_assessment || {}; }
      else if (Array.isArray(plan.plan.steps)) { steps = plan.plan.steps; priority = plan.plan.priority || 'MEDIUM'; estimatedTime = plan.plan.estimated_time; rollbackPlan = plan.plan.rollback_plan; impactAssessment = plan.plan.impact_assessment || {}; }
      else if (Array.isArray(plan.plan)) { steps = plan.plan; priority = plan.priority || 'MEDIUM'; estimatedTime = plan.estimated_time; rollbackPlan = plan.rollback_plan; }
    } else if (Array.isArray(plan.steps)) { steps = plan.steps; priority = plan.priority || 'MEDIUM'; estimatedTime = plan.estimated_time ?? (plan.estimated_time_minutes ? `${plan.estimated_time_minutes} min` : undefined); rollbackPlan = plan.rollback_plan; impactAssessment = plan.impact_assessment || {}; }
    else if (Array.isArray(plan)) { steps = plan; }
  }

  const isAI = isAIIncident(incidentType, rootCause);
  const allSteps = isAI ? [...AI_INCIDENT_STEPS, ...steps.map((s: any, i: number) => ({ ...s, order: (s.order ?? s.step_number ?? i + 1) + AI_INCIDENT_STEPS.length }))] : steps;
  const completedCount = Object.values(stepStatuses).filter(s => s === 'completed').length;
  const progressPct = allSteps.length > 0 ? Math.round((completedCount / allSteps.length) * 100) : 0;

  if (!plan || steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No remediation plan available yet.</p>
      </div>
    );
  }

  const estTimeStr = estimatedTime || (plan?.estimated_time_minutes ? `${plan.estimated_time_minutes} min` : undefined);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Left: title + meta */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">Remediation Plan</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityStyles(priority)}`}>
                  {priority}
                </span>
                {rubricScore && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    rubricScore.overall_score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    rubricScore.overall_score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`} title={rubricScore.summary}>
                    Quality {rubricScore.overall_score}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                RemediationAgent · Nova 2 Lite · {allSteps.length} steps{isAI ? ' · AI-specific steps included' : ''}
              </p>
              {/* Secondary links — subtle */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {isAI && onNavigateToFeature && (
                  <button type="button" onClick={() => onNavigateToFeature('ai-compliance')}
                    className="text-[11px] font-medium text-violet-600 hover:text-violet-800 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> EU AI Act / OWASP LLM
                  </button>
                )}
                {!rubricScore && (
                  <button type="button"
                    onClick={async () => {
                      setRubricLoading(true);
                      setRubricScore(null);
                      try {
                        const ok = await healthCheck();
                        if (ok) {
                          const res = await rubricAPI.evaluatePlan(plan);
                          setRubricScore({ overall_score: res.overall_score, summary: res.summary || '' });
                        }
                      } catch {
                        setRubricScore({ overall_score: 0, summary: 'Backend offline.' });
                      } finally {
                        setRubricLoading(false);
                      }
                    }}
                    disabled={rubricLoading}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 disabled:opacity-60"
                  >
                    {rubricLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Evaluating…</> : 'Evaluate Quality'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: primary CTA */}
          {!approved && onApprove ? (
            <button onClick={handleApprove}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-700 transition-colors flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve Plan
            </button>
          ) : approved ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">Approved</span>
            </div>
          ) : null}
        </div>

        {/* AI Incident — Restore Order Flow */}
        {isAI && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-3.5 h-3.5 text-violet-600" />
              <span className="section-label">AI Incident — Restore Order</span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {[
                { id: 'containment', label: 'Containment', icon: Lock },
                { id: 'investigation', label: 'Investigation', icon: FileText },
                { id: 'remediation', label: 'Remediation', icon: Shield },
                { id: 'documentation', label: 'Documentation', icon: BookOpen },
              ].map((phase, i) => (
                <div key={phase.id} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300">→</span>}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
                    <phase.icon className="w-3 h-3 text-violet-600" />
                    <span className="text-[10px] font-bold text-violet-800">{phase.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Timeline */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="section-label">Execution Flow</span>
          </div>
          <div className="flex items-center">
            {[
              { id: 'plan', label: 'Plan', done: allSteps.length > 0, icon: FileText },
              { id: 'approved', label: 'Approved', done: approved, icon: CheckCircle2 },
              { id: 'executed', label: Object.keys(stepProofs).length > 0 ? 'Executed' : 'Awaiting', done: Object.keys(stepProofs).length > 0, icon: Play },
            ].map((phase, i) => {
              const Icon = phase.icon;
              const prevPhaseDone = i === 0 ? true : [allSteps.length > 0, approved, Object.keys(stepProofs).length > 0][i - 1];
              return (
                <React.Fragment key={phase.id}>
                  {i > 0 && <div className={`w-12 sm:w-16 h-0.5 ${prevPhaseDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                  <div className={`flex flex-col items-center ${phase.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${phase.done ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">{phase.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Impact assessment + Estimated time + Progress bar — single line, aligned */}
        <div className="flex flex-nowrap items-center gap-4 mt-4 pt-4 border-t border-slate-200">
          {estTimeStr && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Est. time: <strong>{estTimeStr}</strong></span>
            </div>
          )}
          <div className="flex items-center text-xs text-slate-600 shrink-0">
            <span className="whitespace-nowrap">
              Impact: <strong>{impactAssessment.resources_affected ?? steps.length} resources</strong> affected
              {impactAssessment.iam_policies_to_modify != null && (
                <>, <strong>{impactAssessment.iam_policies_to_modify} IAM policies</strong> to modify</>
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1">
              <span className="whitespace-nowrap">Remediation Progress</span>
              <span className="shrink-0">{progressPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        </div>

        {/* Nova Act — Browser Automation Plan */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Nova Act — Console Automation</span>
            </div>
            <button
              onClick={async () => {
                setNovaActLoading(true);
                setNovaActPlan(null);
                try {
                  const remSteps = steps.map((s: any) => ({
                    action: s.action || s.command || s.description || 'Remediation step',
                    aws_cli: s.api_call || s.command || s.cli_command || s.aws_cli_command || '',
                    priority: s.risk || s.risk_level || 'MEDIUM',
                  }));
                  const result = await novaActAPI.generateRemediationAutomation(
                    incidentType,
                    rootCause,
                    affectedResources,
                    remSteps
                  );
                  setNovaActPlan(result);
                  setNovaActExpanded(true);
                } catch (err) {
                  setNovaActPlan({ error: 'Backend offline. Nova Act plans require the API.' });
                  setNovaActExpanded(true);
                } finally {
                  setNovaActLoading(false);
                }
              }}
              disabled={novaActLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-70 transition-colors"
            >
              {novaActLoading ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Generate Nova Act Plan</>
              )}
            </button>
          </div>
          {novaActPlan && (
            <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setNovaActExpanded(!novaActExpanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>Nova Act automation plan — {novaActPlan.automation_plan?.total_steps ?? 0} steps</span>
                {novaActExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {novaActExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-2 bg-slate-50/50">
                  {novaActPlan.error ? (
                    <p className="text-xs text-slate-600">{novaActPlan.error}</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">
                        Browser automation steps for AWS Console. Execute via Nova Act SDK or use AWS CLI alternatives below.
                      </p>
                      {(novaActPlan.automation_plan?.steps || []).slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="text-xs bg-white rounded-lg border border-slate-200 p-3">
                          <span className="font-semibold text-slate-700">Step {s.step_number}:</span> <span className="text-slate-600">{s.action}</span>
                          {s.aws_cli_alternative && (
                            <code className="block mt-1.5 font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {s.aws_cli_alternative}
                            </code>
                          )}
                        </div>
                      ))}
                      <a
                        href="https://docs.aws.amazon.com/bedrock/latest/userguide/nova-act.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
                      >
                        <ExternalLink className="w-3 h-3" /> Nova Act docs
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Steps - preserve order (AI steps first when applicable) */}
      <div className="p-6 space-y-2">
        {[...allSteps].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((step: any, index: number) => {
          const stepNumber = (step.order ?? index + 1);
          const action = step.action || step.command || step.description || 'Remediation Action';
          const target = step.target || step.resource || step.resource_name;
          let reason = step.reason || step.description || step.rationale;
          if (!reason || reason === 'No reason provided') {
            const a = action.toLowerCase();
            if (a.includes('revoke') || a.includes('remove')) reason = 'Remove compromised or excessive permissions.';
            else if (a.includes('delete')) reason = 'Eliminate the compromised resource.';
            else if (a.includes('terminate')) reason = 'Stop ongoing malicious activity.';
            else if (a.includes('disable')) reason = 'Disable compromised resource to prevent exploitation.';
            else if (a.includes('detach')) reason = 'Eliminate full admin access — attacker currently has unrestricted AWS access.';
            else if (a.includes('restore') || a.includes('security group')) reason = 'Close SSH and C2 ports that allowed initial access and lateral movement.';
            else if (a.includes('mfa')) reason = 'Prevent future compromise via stolen credentials.';
            else reason = `Addresses the security incident: ${action.toLowerCase()}.`;
          }
          const risk = (step.risk || step.risk_level || step.severity || 'MEDIUM').toUpperCase();
          const apiCall = step.api_call || step.command || step.cli_command || step.aws_cli_command;
          const riskIfSkipped = step.risk_if_skipped;

          // Dynamic classification: infer AUTO vs APPROVAL vs MANUAL from action/risk content
          const inferClassification = (): string => {
            if (step.classification) return step.classification;
            if (step.automation === 'automated') return 'AUTO';
            const lowerAction = (action + ' ' + (apiCall || '')).toLowerCase();
            // High-risk destructive actions always require approval
            if (/terminate|delete|detach.*admin|revoke|purge|destroy|drop|wipe/i.test(lowerAction)) return 'APPROVAL';
            // Safe read or enable actions can be auto-executed
            if (/enable.*guard|enable.*cloudtrail|enable.*macie|enable.*config|create.*detector|put.*block.*public|update.*password.*policy/i.test(lowerAction)) return 'AUTO';
            // IAM policy changes need approval
            if (/attach.*policy|detach.*policy|put.*policy|create.*policy|update.*role/i.test(lowerAction)) return 'APPROVAL';
            // Network changes need approval  
            if (/security.*group|ingress|egress|authorize|revoke.*ingress/i.test(lowerAction)) return 'APPROVAL';
            // Low-risk informational steps can be auto
            if (risk === 'LOW') return 'AUTO';
            if (risk === 'CRITICAL') return 'APPROVAL';
            return step.automation === 'automated' ? 'AUTO' : 'APPROVAL';
          };
          const classification = inferClassification();
          const reversible = step.reversible !== false;
          const status = stepStatuses[stepNumber] || 'pending';
          const isExpanded = expandedSteps.has(stepNumber);
          const proof = stepProofs[stepNumber];

          const handleExecute = async (e: React.MouseEvent) => {
            e.stopPropagation();
            setStepStatuses(prev => ({ ...prev, [stepNumber]: 'in_progress' }));
            try {
              if (incidentId) {
                // Extract enrichment hints from the step to help the backend route correctly
                const targetStr = (target || 'unknown').toString();
                const sgMatch = (targetStr + ' ' + action).match(/sg-[0-9a-f]{6,17}/i);
                const instanceMatch = (targetStr + ' ' + action).match(/i-[0-9a-f]{8,17}/ig);
                const policyMatch = (targetStr + ' ' + action).match(/arn:aws:iam::[^\s]+/i)
                  || (action.toLowerCase().includes('administratoraccess') ? ['arn:aws:iam::aws:policy/AdministratorAccess'] : null);
                const extra = {
                  sgId: sgMatch?.[0],
                  instanceIds: instanceMatch?.join(','),
                  policyArn: policyMatch?.[0],
                  port: action.toLowerCase().includes('ssh') ? 22 : undefined,
                  cidr: '0.0.0.0/0',
                };
                const res = await remediationAPI.executeStep(
                  `step-${stepNumber}`,
                  incidentId,
                  action,
                  targetStr,
                  demoMode,
                  extra,
                );
                if (res.execution_proof) {
                  setStepProofs(prev => ({ ...prev, [stepNumber]: res.execution_proof }));
                }
                setStepStatuses(prev => ({
                  ...prev,
                  [stepNumber]: res.status === 'failed' ? 'failed' : 'completed',
                }));
              } else if (apiCall) {
                // No incident ID — just copy the CLI command
                navigator.clipboard?.writeText(apiCall);
                setStepStatuses(prev => ({ ...prev, [stepNumber]: 'completed' }));
              } else {
                setStepStatuses(prev => ({ ...prev, [stepNumber]: 'completed' }));
              }
            } catch {
              setStepStatuses(prev => ({ ...prev, [stepNumber]: 'failed' }));
            }
            onExecute?.(index);
          };

          const StatusBadge = () => {
            const config: Record<StepStatus, { Icon: React.FC<{ className?: string }>; label: string; cls: string; dotCls: string }> = {
              pending:     { Icon: Circle,      label: 'Pending',     cls: 'bg-slate-50  text-slate-500  border-slate-200',  dotCls: 'text-slate-400'  },
              in_progress: { Icon: Loader2,     label: 'In Progress', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dotCls: 'text-indigo-500 animate-spin' },
              completed:   { Icon: CheckCircle2,label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotCls: 'text-emerald-500' },
              failed:      { Icon: XCircle,     label: 'Failed',      cls: 'bg-red-50   text-red-700    border-red-200',     dotCls: 'text-red-500'    },
            };
            const c = config[status];
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.cls}`}>
                <c.Icon className={`w-3 h-3 ${c.dotCls}`} />
                {c.label}
              </span>
            );
          };

          return (
            <motion.div
              key={stepNumber}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <div
                className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                onClick={() => toggleStep(stepNumber)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                    {stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{action}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{target && `${target} · `}{reason}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <StatusBadge />
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskStyles(risk)}`}>
                      {risk}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      classification === 'AUTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      classification === 'APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {classification === 'AUTO' ? <><CheckCircle2 className="w-2.5 h-2.5" /> Auto</> : classification === 'APPROVAL' ? <><MousePointerClick className="w-2.5 h-2.5" /> Approval</> : <><Bot className="w-2.5 h-2.5" /> Manual</>}
                    </span>
                  </div>
                </div>
                <span className="ml-3 text-slate-400 flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 bg-slate-50"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Reason</p>
                        <p className="text-xs text-slate-500">{reason}</p>
                      </div>
                      {riskIfSkipped && (
                        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg">
                          <p className="text-[10px] font-semibold text-slate-600 mb-0.5">If skipped:</p>
                          <p className="text-xs text-slate-500">{riskIfSkipped}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500">Classification:</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          classification === 'AUTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          classification === 'APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {classification === 'AUTO' ? <><CheckCircle2 className="w-2.5 h-2.5" /> Auto-Execute</> : classification === 'APPROVAL' ? <><MousePointerClick className="w-2.5 h-2.5" /> Requires Approval</> : <><Bot className="w-2.5 h-2.5" /> Manual Only</>}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${reversible ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {reversible ? <><RotateCcw className="w-2.5 h-2.5" /> Reversible</> : <><AlertTriangle className="w-2.5 h-2.5" /> Irreversible</>}
                        </span>
                      </div>
                      {apiCall && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> AWS CLI
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(apiCall); }}
                              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy
                            </button>
                          </p>
                          <code className="text-[11px] bg-slate-900 text-green-400 px-3 py-2 rounded-lg block whitespace-pre-wrap font-mono">
                            {apiCall}
                          </code>
                        </div>
                      )}
                      {proof ? (
                        <div className="rounded-lg border border-emerald-200 bg-slate-900 text-green-400 p-4 font-mono text-xs space-y-3">
                          {proof.status === 'SIMULATED' ? (
                            <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> SIMULATED (Demo Mode)</div>
                          ) : proof.status === 'MANUAL_REQUIRED' ? (
                            <div className="font-bold text-blue-400 text-sm flex items-center gap-1.5"><Bot className="w-4 h-4" /> MANUAL ACTION REQUIRED</div>
                          ) : proof.status === 'FAILED' ? (
                            <div className="font-bold text-red-400 text-sm flex items-center gap-1.5"><XCircle className="w-4 h-4" /> EXECUTION FAILED</div>
                          ) : (
                            <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> EXECUTED ON AWS</div>
                          )}
                          <div>Action: {proof.action_type}</div>
                          <div>Target: {proof.resource_arn}</div>
                          <div>Executed: {proof.execution_timestamp}</div>
                          <div>Executed By: {proof.executed_by}</div>
                          <div>Status: {proof.status}</div>
                          {proof.message && (
                            <div className="text-amber-300 text-[10px] mt-1 whitespace-pre-wrap">Note: {proof.message}</div>
                          )}
                          {proof.before_state && Object.keys(proof.before_state).length > 0 && (
                            <div className="pt-2 border-t border-slate-700">
                              <span className="text-slate-400">Before State:</span>
                              <pre className="mt-1 text-[10px] text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(proof.before_state, null, 2)}</pre>
                            </div>
                          )}
                          {proof.after_state && Object.keys(proof.after_state).length > 0 && (
                            <div>
                              <span className="text-slate-400">After State:</span>
                              <pre className="mt-1 text-[10px] text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(proof.after_state, null, 2)}</pre>
                            </div>
                          )}
                          {proof.cloudtrail_event && Object.keys(proof.cloudtrail_event).length > 0 && (
                            <ProofCloudTrail event={proof.cloudtrail_event} />
                          )}
                          {proof.rollback_command && (
                            <div className="pt-2 border-t border-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-amber-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Rollback Command:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(proof.rollback_command);
                                  }}
                                  className="px-2 py-1 rounded text-[10px] font-bold bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 transition-colors flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Copy Rollback
                                </button>
                              </div>
                              <code className="block mt-1 text-[10px] text-amber-300 whitespace-pre-wrap break-all">{proof.rollback_command}</code>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Mode indicator */}
                          {demoMode ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <p className="text-[11px] text-amber-700 font-medium">Demo mode — execution is simulated, no real AWS call is made.</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <p className="text-[11px] text-emerald-700 font-semibold">Live AWS account — this will make real changes to your AWS environment.</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={handleExecute}
                              disabled={executing}
                              className={`px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-colors ${
                                demoMode
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  : classification === 'APPROVAL'
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-slate-900 text-white hover:bg-slate-700'
                              }`}
                            >
                              <Play className="w-3.5 h-3.5" />
                              {demoMode ? 'Simulate' : classification === 'APPROVAL' ? 'Approve & Execute on AWS' : 'Auto-Execute on AWS'}
                            </button>
                            {reversible && apiCall && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Generate a plausible rollback command from the CLI
                                  const rollbackCmd = apiCall
                                    .replace('--enable', '--disable')
                                    .replace('attach-role-policy', 'detach-role-policy')
                                    .replace('attach-user-policy', 'detach-user-policy')
                                    .replace('create-user', 'delete-user')
                                    .replace('authorize-security-group-ingress', 'revoke-security-group-ingress')
                                    .replace('put-public-access-block', 'delete-public-access-block');
                                  navigator.clipboard?.writeText(`# Rollback command\n${rollbackCmd}`);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                                title="Copy rollback command to clipboard"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Copy Rollback
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Rollback Plan — show existing or generate from steps */}
      {(rollbackPlan || (allSteps.length > 0 && !rollbackPlan)) && (
        <div className="mx-6 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <RotateCcw className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-0.5">Rollback Plan</h4>
                {rollbackPlan ? (
                  <p className="text-xs text-slate-500">{rollbackPlan}</p>
                ) : (
                  <p className="text-xs text-slate-500">Execute these commands in reverse order to undo applied remediation steps.</p>
                )}
              </div>
            </div>
            {!rollbackPlan && allSteps.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const withRollback = allSteps
                    .filter((s: any) => s.api_call || s.command || s.aws_cli_command)
                    .map((s: any) => s.api_call || s.command || s.aws_cli_command)
                    .filter(Boolean);
                  if (withRollback.length > 0) {
                    const undo = [...withRollback].reverse().map((cmd, i) => `# Undo step ${withRollback.length - i}\n${cmd}`).join('\n\n');
                    navigator.clipboard?.writeText(undo);
                    setRollbackExpanded(true);
                  }
                }}
                className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 shrink-0 transition-colors"
                title="Creates undo sequence from executed steps and copies to clipboard"
              >
                Generate & Copy Rollback
              </button>
            )}
          </div>
          {!rollbackPlan && (() => {
            const rollbackCmds = allSteps
              .filter((s: any) => s.api_call || s.command || s.aws_cli_command)
              .map((s: any) => s.api_call || s.command || s.aws_cli_command)
              .filter(Boolean);
            if (rollbackCmds.length > 0) {
              const generated = [...rollbackCmds].reverse().map((cmd, i) => `# Undo step ${rollbackCmds.length - i}\n${cmd}`).join('\n\n');
              return (
                <details className="mt-2" open={rollbackExpanded}>
                  <summary
                    className="text-[10px] font-semibold text-slate-600 cursor-pointer"
                    onClick={(e) => { e.preventDefault(); setRollbackExpanded(v => !v); }}
                  >
                    {rollbackExpanded ? 'Hide' : 'Show'} generated undo sequence
                  </summary>
                  <pre className="mt-2 text-[10px] text-slate-500 bg-white border border-slate-200 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">{generated}</pre>
                </details>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default RemediationPlan;
