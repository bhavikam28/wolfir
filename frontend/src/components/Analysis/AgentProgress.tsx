/**
 * Agent Progress Component - Shows real-time progress of multi-agent analysis
 */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  Clock, 
  Brain, 
  Eye, 
  Zap, 
  Shield,
  SkipForward
} from 'lucide-react';
import type { AgentStatus } from '../../types/incident';

interface AgentProgressProps {
  agents: {
    temporal?: { status: AgentStatus };
    visual?: { status: AgentStatus };
    risk_scorer?: { status: AgentStatus };
    remediation?: { status: AgentStatus };
  };
}

const AgentProgress: React.FC<AgentProgressProps> = ({ agents }) => {
  const agentConfig = [
    {
      id: 'temporal',
      name: 'Temporal Analysis',
      description: 'Nova 2 Lite - Building timeline and identifying root cause',
      icon: Brain,
      color: 'indigo',
      status: agents.temporal?.status || 'PENDING',
    },
    {
      id: 'visual',
      name: 'Visual Analysis',
      description: 'Nova Pro - Analyzing architecture diagrams',
      icon: Eye,
      color: 'blue',
      status: agents.visual?.status || 'PENDING',
    },
    {
      id: 'risk_scorer',
      name: 'Risk Scoring',
      description: 'Nova Micro - Assessing security risk levels',
      icon: Zap,
      color: 'yellow',
      status: agents.risk_scorer?.status || 'PENDING',
    },
    {
      id: 'remediation',
      name: 'Remediation Planning',
      description: 'Nova 2 Lite - Generating remediation plan',
      icon: Shield,
      color: 'green',
      status: agents.remediation?.status || 'PENDING',
    },
  ];

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'RUNNING':
        return <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'SKIPPED':
        return <SkipForward className="w-5 h-5 text-slate-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: AgentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'RUNNING':
        return 'Running...';
      case 'FAILED':
        return 'Failed';
      case 'SKIPPED':
        return 'Skipped';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: AgentStatus, color: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200';
      case 'RUNNING':
        return `bg-${color}-50 border-${color}-300`;
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      case 'SKIPPED':
        return 'bg-slate-50 border-slate-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Multi-Agent Analysis Progress
      </h3>
      <div className="space-y-3">
        {agentConfig.map((agent, index) => {
          const Icon = agent.icon;
          const status = agent.status;
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${getStatusColor(status, agent.color)}`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  agent.color === 'indigo' ? 'bg-gradient-to-br from-indigo-100 to-indigo-200' :
                  agent.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                  agent.color === 'yellow' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' :
                  'bg-gradient-to-br from-green-100 to-green-200'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    agent.color === 'indigo' ? 'text-indigo-600' :
                    agent.color === 'blue' ? 'text-blue-600' :
                    agent.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{agent.name}</h4>
                    {getStatusIcon(status)}
                  </div>
                  <p className="text-sm text-slate-600">{agent.description}</p>
                </div>
              </div>
              <div className="ml-4">
                <span className={`text-sm font-medium ${
                  status === 'COMPLETED' ? 'text-green-700' :
                  status === 'RUNNING' ? (
                    agent.color === 'indigo' ? 'text-indigo-700' :
                    agent.color === 'blue' ? 'text-blue-700' :
                    agent.color === 'yellow' ? 'text-yellow-700' :
                    'text-green-700'
                  ) :
                  status === 'FAILED' ? 'text-red-700' :
                  'text-slate-500'
                }`}>
                  {getStatusText(status)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentProgress;
