/**
 * Agent Progress - Analysis Pipeline Status
 * Shows multi-agent analysis completion with model attribution
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Loader2, XCircle, Clock,
  Timer, ImageIcon, Gauge, Wrench, BookOpen
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
  // Visual analysis runs separately (IncidentArchitectureDiagram auto-generates from timeline).
  // If the orchestrator completed (temporal is done), visual is also done.
  const visualStatus: AgentStatus =
    agents.visual?.status === 'COMPLETED' ? 'COMPLETED' :
    agents.visual?.status === 'RUNNING' ? 'RUNNING' :
    agents.visual?.status === 'FAILED' ? 'FAILED' :
    // Infer: if temporal completed, visual also ran (architecture diagram auto-generated)
    agents.temporal?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING';

  const agentConfig = [
    { id: 'temporal', name: 'Temporal Analysis', model: 'Nova 2 Lite', icon: Timer, gradient: 'from-slate-600 to-slate-700', status: agents.temporal?.status || 'PENDING', desc: 'Builds incident timeline from CloudTrail. Identifies root cause, attack pattern, and blast radius.' },
    { id: 'visual', name: 'Visual Analysis', model: 'Nova Pro', icon: ImageIcon, gradient: 'from-blue-600 to-indigo-700', status: visualStatus, desc: 'Maps affected resources into a security visualization. Highlights compromised vs at-risk assets.' },
    { id: 'risk_scorer', name: 'Risk Scoring', model: 'Nova Micro', icon: Gauge, gradient: 'from-amber-600 to-orange-700', status: agents.risk_scorer?.status || 'PENDING', desc: 'Assigns severity and MITRE ATT&CK technique IDs to each event.' },
    { id: 'remediation', name: 'Remediation', model: 'Nova 2 Lite', icon: Wrench, gradient: 'from-emerald-600 to-teal-700', status: agents.remediation?.status || 'PENDING', desc: 'Generates step-by-step remediation plan with AWS CLI commands.' },
    { id: 'documentation', name: 'Documentation', model: 'Nova 2 Lite', icon: BookOpen, gradient: 'from-violet-600 to-purple-700', status: agents.documentation?.status || 'PENDING', desc: 'Creates JIRA tickets, Slack alerts, and Confluence post-incident reports.' },
  ];

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'RUNNING': return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  const completedCount = agentConfig.filter(a => a.status === 'COMPLETED' || a.status === 'SKIPPED').length;
  const progressPercent = (completedCount / agentConfig.length) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
      {/* Header with progress bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Core Analysis Pipeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount}/{agentConfig.length} agents completed — each agent is a specialized AI that runs a different analysis step
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Agent Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                isRunning ? 'border-indigo-300 bg-indigo-50/50 shadow-glow-sm animate-border-glow' :
                isCompleted ? 'border-emerald-200 bg-emerald-50/30' :
                isFailed ? 'border-red-200 bg-red-50/30' :
                'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-sm ${isCompleted || isRunning ? 'opacity-100' : 'opacity-40'}`}>
                  <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                </div>
                {getStatusIcon(agent.status)}
              </div>
              
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">{agent.name}</h4>
              <p className="text-[10px] text-slate-500 font-medium mb-1">{agent.model}</p>
              <p className="text-[9px] text-slate-400 leading-tight line-clamp-2" title={agent.desc}>{agent.desc}</p>

              {/* Running shimmer effect */}
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
  );
};

export default AgentProgress;
