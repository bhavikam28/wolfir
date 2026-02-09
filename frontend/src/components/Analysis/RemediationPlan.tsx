/**
 * Remediation Plan Component - Display and approve remediation plans
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  FileText,
} from 'lucide-react';

interface RemediationStep {
  step: number;
  action: string;
  target: string;
  reason: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  api_call?: string;
}

interface RemediationPlan {
  plan: RemediationStep[];
  priority: string;
  estimated_time?: string;
  rollback_plan?: string;
}

interface RemediationPlanProps {
  plan: RemediationPlan | any;
  onApprove?: (plan: RemediationPlan) => void;
  onExecute?: (stepIndex: number) => void;
  executing?: boolean;
}

const RemediationPlan: React.FC<RemediationPlanProps> = ({
  plan,
  onApprove,
  onExecute,
  executing = false,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [approved, setApproved] = useState(false);

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  const handleApprove = () => {
    setApproved(true);
    if (onApprove) {
      onApprove(plan);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'IMMEDIATE':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  // Handle multiple possible data structures from backend
  let steps: RemediationStep[] = [];
  let priority = 'MEDIUM';
  let estimatedTime: string | undefined;
  let rollbackPlan: string | undefined;

  if (plan) {
    console.log('Remediation plan received:', JSON.stringify(plan, null, 2));
    
    // Try different possible structures
    if (plan.plan) {
      // Structure: { plan: { plan: [...], priority: ..., ... } }
      if (Array.isArray(plan.plan.plan)) {
        steps = plan.plan.plan;
        priority = plan.plan.priority || 'MEDIUM';
        estimatedTime = plan.plan.estimated_time;
        rollbackPlan = plan.plan.rollback_plan;
      } else if (Array.isArray(plan.plan.steps)) {
        // Structure: { plan: { steps: [...], priority: ..., ... } }
        steps = plan.plan.steps;
        priority = plan.plan.priority || 'MEDIUM';
        estimatedTime = plan.plan.estimated_time;
        rollbackPlan = plan.plan.rollback_plan;
      } else if (Array.isArray(plan.plan)) {
        // Structure: { plan: [...] }
        steps = plan.plan;
        priority = plan.priority || 'MEDIUM';
        estimatedTime = plan.estimated_time;
        rollbackPlan = plan.rollback_plan;
      }
    } else if (Array.isArray(plan.steps)) {
      // Structure: { steps: [...], priority: ..., ... }
      steps = plan.steps;
      priority = plan.priority || 'MEDIUM';
      estimatedTime = plan.estimated_time;
      rollbackPlan = plan.rollback_plan;
    } else if (Array.isArray(plan)) {
      // Structure: [...] (just an array)
      steps = plan;
    }
    
    console.log('Extracted steps:', steps.length, 'Priority:', priority);
  }

  // If still no steps, check if plan has a raw_response we can parse
  if (steps.length === 0 && plan?.raw_response) {
    // Try to extract steps from raw response text
    console.warn('Remediation plan structure not recognized, attempting to parse raw response');
    console.warn('Plan keys:', Object.keys(plan || {}));
  }

  if (!plan || steps.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No remediation plan available yet.</p>
          {plan && (
            <p className="text-xs text-slate-500 mt-2">
              Plan data received but structure not recognized. Check console for details.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Remediation Plan
          </h3>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(priority)}`}>
              {priority} Priority
            </span>
            {estimatedTime && (
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
        {!approved && onApprove && (
          <button
            onClick={handleApprove}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve Plan
          </button>
        )}
        {approved && (
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Approved</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step: any, index: number) => {
          // Handle different step structures
          const stepNumber = step.step || step.step_number || step.stepNumber || (index + 1);
          const action = step.action || step.command || step.description || 'Remediation Action';
          const target = step.target || step.resource || step.resource_name || step.resourceName;
          let reason = step.reason || step.description || step.rationale || step.explanation;
          // Generate a basic reason from action if none provided
          if (!reason || reason === 'No reason provided') {
            // Generate a contextual reason based on the action
            const actionLower = action.toLowerCase();
            if (actionLower.includes('revoke') || actionLower.includes('remove')) {
              reason = `This action removes compromised or excessive permissions to prevent further unauthorized access.`;
            } else if (actionLower.includes('delete')) {
              reason = `This action removes the compromised resource to eliminate the security threat.`;
            } else if (actionLower.includes('terminate')) {
              reason = `This action stops the compromised resource to prevent ongoing malicious activity.`;
            } else if (actionLower.includes('disable')) {
              reason = `This action disables the compromised resource to prevent further exploitation.`;
            } else if (actionLower.includes('update') || actionLower.includes('modify')) {
              reason = `This action updates the resource configuration to secure it according to AWS best practices.`;
            } else {
              reason = `This remediation step addresses the security incident by ${action.toLowerCase()}.`;
            }
          }
          const risk = step.risk || step.risk_level || step.riskLevel || 'MEDIUM';
          const apiCall = step.api_call || step.command || step.cli_command || step.cliCommand || step.aws_cli_command;
          
          const isExpanded = expandedSteps.has(stepNumber);
          return (
            <motion.div
              key={stepNumber}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => toggleStep(stepNumber)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0">
                      {stepNumber}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {action}
                      </h4>
                      {target && (
                        <p className="text-sm text-slate-600">{target}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(risk)}`}>
                      {risk} Risk
                    </span>
                  </div>
                  <button className="ml-4 text-slate-400 hover:text-slate-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-200 bg-white"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                        <p className="text-sm text-slate-600">{reason}</p>
                      </div>
                      {apiCall && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">Command/API Call:</p>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 block whitespace-pre-wrap break-all">
                            {apiCall}
                          </code>
                        </div>
                      )}
                      {step.rollback_command && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">Rollback:</p>
                          <code className="text-xs bg-amber-50 px-2 py-1 rounded text-slate-800 block whitespace-pre-wrap break-all">
                            {step.rollback_command}
                          </code>
                        </div>
                      )}
                      {step.estimated_time && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">Estimated Time:</p>
                          <p className="text-sm text-slate-600">{step.estimated_time}</p>
                        </div>
                      )}
                      {approved && onExecute && (
                        <button
                          onClick={() => onExecute(index)}
                          disabled={executing}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Execute Step
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
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Rollback Plan</h4>
              <p className="text-sm text-amber-800">{rollbackPlan}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemediationPlan;
