/**
 * Remediation Plan - Step-by-step plan with expandable details and approval flow
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, AlertTriangle, ChevronDown,
  ChevronUp, Play, Clock
} from 'lucide-react';

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
  onApprove?: (plan: RemediationPlanData) => void;
  onExecute?: (stepIndex: number) => void;
  executing?: boolean;
}

const RemediationPlan: React.FC<RemediationPlanProps> = ({ plan, onApprove, onExecute, executing = false }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [approved, setApproved] = useState(false);

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

  if (plan) {
    if (plan.plan) {
      if (Array.isArray(plan.plan.plan)) { steps = plan.plan.plan; priority = plan.plan.priority || 'MEDIUM'; estimatedTime = plan.plan.estimated_time; rollbackPlan = plan.plan.rollback_plan; }
      else if (Array.isArray(plan.plan.steps)) { steps = plan.plan.steps; priority = plan.plan.priority || 'MEDIUM'; estimatedTime = plan.plan.estimated_time; rollbackPlan = plan.plan.rollback_plan; }
      else if (Array.isArray(plan.plan)) { steps = plan.plan; priority = plan.priority || 'MEDIUM'; estimatedTime = plan.estimated_time; rollbackPlan = plan.rollback_plan; }
    } else if (Array.isArray(plan.steps)) { steps = plan.steps; priority = plan.priority || 'MEDIUM'; estimatedTime = plan.estimated_time; rollbackPlan = plan.rollback_plan; }
    else if (Array.isArray(plan)) { steps = plan; }
  }

  if (!plan || steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No remediation plan available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">Remediation Plan</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityStyles(priority)}`}>
              {priority}
            </span>
            {estimatedTime && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" /> {estimatedTime}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{steps.length} remediation steps</p>
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

      {/* Steps - sorted by severity: CRITICAL → HIGH → MEDIUM → LOW */}
      <div className="p-6 space-y-2">
        {[...steps].sort((a: any, b: any) => {
          const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          const riskA = (a.risk || a.risk_level || 'MEDIUM').toUpperCase();
          const riskB = (b.risk || b.risk_level || 'MEDIUM').toUpperCase();
          return (severityOrder[riskA] ?? 4) - (severityOrder[riskB] ?? 4);
        }).map((step: any, index: number) => {
          const stepNumber = index + 1;
          const action = step.action || step.command || step.description || 'Remediation Action';
          const target = step.target || step.resource || step.resource_name;
          let reason = step.reason || step.description || step.rationale;
          if (!reason || reason === 'No reason provided') {
            const a = action.toLowerCase();
            if (a.includes('revoke') || a.includes('remove')) reason = 'Remove compromised or excessive permissions.';
            else if (a.includes('delete')) reason = 'Eliminate the compromised resource.';
            else if (a.includes('terminate')) reason = 'Stop ongoing malicious activity.';
            else if (a.includes('disable')) reason = 'Disable compromised resource to prevent exploitation.';
            else reason = `Addresses the security incident: ${action.toLowerCase()}.`;
          }
          const risk = (step.risk || step.risk_level || 'MEDIUM').toUpperCase();
          const apiCall = step.api_call || step.command || step.cli_command || step.aws_cli_command;
          const isExpanded = expandedSteps.has(stepNumber);

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
                    {target && <p className="text-xs text-slate-500 truncate">{target}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${getRiskStyles(risk)}`}>
                    {risk}
                  </span>
                </div>
                <button className="ml-3 text-slate-400 hover:text-slate-600 flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
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
                      {apiCall && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">Command</p>
                          <code className="text-[11px] bg-slate-900 text-green-400 px-3 py-2 rounded-lg block whitespace-pre-wrap font-mono">
                            {apiCall}
                          </code>
                        </div>
                      )}
                      {approved && onExecute && (
                        <button
                          onClick={() => onExecute(index)}
                          disabled={executing}
                          className="btn-nova px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" /> Execute Step
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
