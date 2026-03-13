/**
 * Agent Progress - Analysis Pipeline Status
 * Shows multi-agent analysis completion with model attribution
 * Collapsible by default to reduce clutter on Security tab
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Loader2, XCircle, Clock,
  Timer, ImageIcon, Gauge, Wrench, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import type { AgentStatus } from '../../types/incident';

interface AgentProgressProps {
  agents: {
    temporal?: { status: AgentStatus };
    visual?: { status: AgentStatus };
    risk_scorer?: { status: AgentStatus };
    remediation?: { status: AgentStatus };
    documentation?: { status: AgentStatus };
  };
}

const AgentProgress: React.FC<AgentProgressProps> = ({ agents }) => {
  const [expanded, setExpanded] = useState(false);

  // Visual analysis runs separately (IncidentArchitectureDiagram auto-generates from timeline).
  // If the orchestrator completed (temporal is done), visual is also done.
  const visualStatus: AgentStatus =
    agents.visual?.status === 'COMPLETED' ? 'COMPLETED' :
    agents.visual?.status === 'RUNNING' ? 'RUNNING' :
    agents.visual?.status === 'FAILED' ? 'FAILED' :
    // Infer: if temporal completed, visual also ran (architecture diagram auto-generated)
    agents.temporal?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING';

  const agentConfig = [
    { id: 'temporal', name: 'Temporal Analysis', model: 'Nova 2 Lite · temporal reasoning', packName: 'Tracker', icon: Timer, status: agents.temporal?.status || 'PENDING', desc: 'Builds incident timeline from CloudTrail. Identifies root cause, attack pattern, and blast radius.', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { id: 'visual', name: 'Architecture & STRIDE', model: 'Nova Pro · multimodal', packName: 'Scout', icon: ImageIcon, status: visualStatus, desc: 'Maps affected resources into a security visualization. STRIDE threat model from diagrams.', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
    { id: 'risk_scorer', name: 'Risk Scoring', model: 'Nova Micro · classification', packName: 'Scorer', icon: Gauge, status: agents.risk_scorer?.status || 'PENDING', desc: 'Assigns severity and MITRE ATT&CK technique IDs to each event.', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { id: 'remediation', name: 'Remediation', model: 'Nova 2 Lite · remediation', packName: 'Fixer', icon: Wrench, status: agents.remediation?.status || 'PENDING', desc: 'Generates step-by-step remediation plan with AWS CLI commands.', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { id: 'documentation', name: 'Documentation', model: 'Nova 2 Lite · documentation', packName: 'Scribe', icon: BookOpen, status: agents.documentation?.status || 'PENDING', desc: 'Creates JIRA tickets, Slack alerts, and Confluence post-incident reports.', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  ];

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
      case 'RUNNING': return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-slate-400" />;
      default: return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  const completedCount = agentConfig.filter(a => a.status === 'COMPLETED' || a.status === 'SKIPPED').length;
  const progressPercent = (completedCount / agentConfig.length) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Compact header — click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-700">Core Analysis Pipeline</h3>
          <span className="text-xs text-slate-500">
            {completedCount}/{agentConfig.length} agents · {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Agent Pipeline — expandable */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-slate-100">
              <p className="text-sm text-slate-600 mt-3 mb-4">Each agent is a specialized AI that runs a different analysis step.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {agentConfig.map((agent, index) => {
                  const Icon = agent.icon;
                  const isRunning = agent.status === 'RUNNING';
                  const isCompleted = agent.status === 'COMPLETED';
                  const isFailed = agent.status === 'FAILED';

                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative p-4 rounded-xl border transition-all duration-300 ${
                        isRunning ? 'border-indigo-200 bg-indigo-50/50' :
                        isCompleted ? 'border-slate-200 bg-white' :
                        isFailed ? 'border-slate-200 bg-slate-50/50' :
                        'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg ${agent.iconBg} border border-slate-200 flex items-center justify-center ${isCompleted || isRunning ? 'opacity-100' : 'opacity-60'}`}>
                          <Icon className={`w-4.5 h-4.5 ${agent.iconColor}`} strokeWidth={1.8} />
                        </div>
                        {getStatusIcon(agent.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-slate-900">{agent.name}</h4>
                        {(agent as { packName?: string }).packName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold" title="wolf + ir — hunts in a pack">
                            {(agent as { packName: string }).packName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-2" title="Model used for this step">{(agent as { model: string }).model}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{agent.desc}</p>
                      {isRunning && (
                        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                          <div className="absolute inset-0 shimmer" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentProgress;
