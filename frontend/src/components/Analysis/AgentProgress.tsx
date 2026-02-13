/**
 * Agent Progress - Animated Pipeline with Status Indicators
 * Shows real-time multi-agent analysis progress
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Loader2, XCircle, Clock,
  Brain, Eye, Zap, Shield, SkipForward, FileText
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
  const agentConfig = [
    { id: 'temporal', name: 'Temporal Analysis', model: 'Nova 2 Lite', icon: Brain, gradient: 'from-purple-500 to-indigo-600', lightBg: 'bg-purple-50', status: agents.temporal?.status || 'PENDING' },
    { id: 'visual', name: 'Visual Analysis', model: 'Nova Pro', icon: Eye, gradient: 'from-blue-500 to-cyan-600', lightBg: 'bg-blue-50', status: agents.visual?.status || 'SKIPPED' },
    { id: 'risk_scorer', name: 'Risk Scoring', model: 'Nova Micro', icon: Zap, gradient: 'from-amber-500 to-orange-600', lightBg: 'bg-amber-50', status: agents.risk_scorer?.status || 'PENDING' },
    { id: 'remediation', name: 'Remediation', model: 'Nova 2 Lite', icon: Shield, gradient: 'from-emerald-500 to-green-600', lightBg: 'bg-emerald-50', status: agents.remediation?.status || 'PENDING' },
    { id: 'documentation', name: 'Documentation', model: 'Nova 2 Lite', icon: FileText, gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50', status: agents.documentation?.status || 'PENDING' },
  ];

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'RUNNING': return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'SKIPPED': return <SkipForward className="w-4 h-4 text-slate-400" />;
      default: return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  const doneCount = agentConfig.filter(a => a.status === 'COMPLETED' || a.status === 'SKIPPED').length;
  const progressPercent = (doneCount / agentConfig.length) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
      {/* Header with progress bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Core Analysis Pipeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {doneCount}/{agentConfig.length} agents completed
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
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center ${isCompleted ? 'opacity-100' : isRunning ? 'opacity-100' : 'opacity-40'}`}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                {getStatusIcon(agent.status)}
              </div>
              
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">{agent.name}</h4>
              <p className="text-[10px] text-slate-500 font-medium">{agent.model}</p>

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
