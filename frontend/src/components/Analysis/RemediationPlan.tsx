/**
 * Remediation Plan - Step-by-step plan with expandable details and approval flow
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, AlertTriangle, ChevronDown,
  ChevronUp, Play, Clock, Terminal, Copy, Brain, FileText
} from 'lucide-react';
import { remediationAPI } from '../../services/api';

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
  demoMode?: boolean;
  onApprove?: (plan: RemediationPlanData) => void;
  onExecute?: (stepIndex: number) => void;
  executing?: boolean;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

const RemediationPlan: React.FC<RemediationPlanProps> = ({ plan, incidentId, demoMode = false, onApprove, onExecute, executing = false }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [approved, setApproved] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  const [stepProofs, setStepProofs] = useState<Record<number, any>>({});

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

  const getRiskNumberStyle = (risk: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-emerald-100 text-emerald-700',
      MEDIUM: 'bg-amber-100 text-amber-700',
      HIGH: 'bg-red-100 text-red-700',
      CRITICAL: 'bg-red-200 text-red-800',
    };
    return styles[risk.toUpperCase()] || 'bg-indigo-100 text-indigo-700';
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

  const completedCount = Object.values(stepStatuses).filter(s => s === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

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
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">Remediation Plan</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityStyles(priority)}`}>
                {priority}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                <Brain className="w-3 h-3" /> Generated by RemediationAgent (Nova 2 Lite)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{steps.length} remediation steps</p>
            </div>
          </div>
        {!approved && onApprove ? (
          <button
            onClick={handleApprove}
            className="btn-nova px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Generate Docs
          </button>
        ) : approved ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">Approved</span>
          </div>
        ) : null}
        </div>

        {/* Execution Timeline */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Execution Flow</span>
          </div>
          <div className="flex items-center">
            {[
              { id: 'plan', label: 'Plan', done: steps.length > 0, icon: FileText },
              { id: 'approved', label: 'Approved', done: approved, icon: CheckCircle2 },
              { id: 'executed', label: Object.keys(stepProofs).length > 0 ? 'Executed' : 'Awaiting', done: Object.keys(stepProofs).length > 0, icon: Play },
            ].map((phase, i) => {
              const Icon = phase.icon;
              const prevPhaseDone = i === 0 ? true : [steps.length > 0, approved, Object.keys(stepProofs).length > 0][i - 1];
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
      </div>

      {/* Steps - preserve order */}
      <div className="p-6 space-y-2">
        {[...steps].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((step: any, index: number) => {
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
          const classification = step.classification || (step.automation === 'automated' ? 'AUTO' : 'APPROVAL');
          const reversible = step.reversible !== false;
          const status = stepStatuses[stepNumber] || 'pending';
          const isExpanded = expandedSteps.has(stepNumber);
          const proof = stepProofs[stepNumber];

          const handleExecute = async (e: React.MouseEvent) => {
            e.stopPropagation();
            setStepStatuses(prev => ({ ...prev, [stepNumber]: 'in_progress' }));
            try {
              if (incidentId && (classification === 'AUTO' || classification === 'APPROVAL')) {
                const res = await remediationAPI.executeStep(
                  `step-${stepNumber}`,
                  incidentId,
                  action,
                  (target || 'unknown').toString(),
                  demoMode
                );
                if (res.execution_proof) {
                  setStepProofs(prev => ({ ...prev, [stepNumber]: res.execution_proof }));
                }
              } else if (apiCall) {
                navigator.clipboard?.writeText(apiCall);
              }
              setStepStatuses(prev => ({ ...prev, [stepNumber]: 'completed' }));
            } catch {
              setStepStatuses(prev => ({ ...prev, [stepNumber]: 'failed' }));
            }
            onExecute?.(index);
          };

          const StatusBadge = () => {
            const config: Record<StepStatus, { icon: string; label: string; cls: string }> = {
              pending: { icon: '⏳', label: 'Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
              in_progress: { icon: '▶️', label: 'In Progress', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
              completed: { icon: '✅', label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              failed: { icon: '❌', label: 'Failed', cls: 'bg-red-100 text-red-700 border-red-200' },
            };
            const c = config[status];
            return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${c.cls}`}>{c.icon} {c.label}</span>;
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
                  <div className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${getRiskNumberStyle(risk)}`}>
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
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      classification === 'AUTO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      classification === 'APPROVAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {classification === 'AUTO' ? '🟢 AUTO' : classification === 'APPROVAL' ? '🟠 APPROVAL' : '🔴 MANUAL'}
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
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-[10px] font-bold text-amber-800 mb-0.5">If skipped:</p>
                          <p className="text-xs text-amber-700">{riskIfSkipped}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500">Classification:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          classification === 'AUTO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          classification === 'APPROVAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {classification === 'AUTO' ? '🟢 AUTO-EXECUTE' : classification === 'APPROVAL' ? '🟠 REQUIRES APPROVAL' : '🔴 MANUAL ONLY'}
                        </span>
                        <span className="text-[10px] text-slate-600">{reversible ? '✅ Reversible' : '⚠️ Irreversible'}</span>
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
                          <div className="font-bold text-emerald-400 text-sm">✅ REMEDIATION EXECUTED</div>
                          <div>Action: {proof.action_type}</div>
                          <div>Target: {proof.resource_arn}</div>
                          <div>Executed: {proof.execution_timestamp}</div>
                          <div>Executed By: {proof.executed_by}</div>
                          <div>Status: {proof.status}</div>
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
                                <span className="text-amber-400">🔄 Rollback Command:</span>
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
                        <button
                          onClick={handleExecute}
                          disabled={executing}
                          className={`px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors ${
                            classification === 'APPROVAL'
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'btn-nova bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {classification === 'APPROVAL' ? 'Approve & Execute' : classification === 'AUTO' ? 'Execute' : apiCall ? 'Copy Command' : 'Execute'} Step
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {rollbackPlan && (
        <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 mb-0.5">Rollback Plan</h4>
            <p className="text-xs text-amber-700">{rollbackPlan}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemediationPlan;
