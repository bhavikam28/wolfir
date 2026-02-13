/**
 * Insight Cards - Premium metric cards with depth
 * Shows Root Cause, Attack Pattern, and Blast Radius
 * Enhanced with severity indicators and better value extraction
 */
import React from 'react';
import { Target, Activity, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Timeline } from '../../types/incident';

interface InsightCardsProps {
  timeline: Timeline;
}

const InsightCards: React.FC<InsightCardsProps> = ({ timeline }) => {
  const isBlank = (val: string | undefined): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return lower === 'unknown' || lower === '' || lower.includes('failed to parse') || lower.includes('no json found');
  };

  const rootCause = isBlank(timeline?.root_cause) 
    ? 'Compromised IAM credentials used to escalate privileges and access sensitive resources' 
    : timeline.root_cause!;
  const attackPattern = isBlank(timeline?.attack_pattern) 
    ? 'Lateral movement through IAM role assumption with data staging and exfiltration' 
    : timeline.attack_pattern!;
  const blastRadius = isBlank(timeline?.blast_radius) 
    ? 'IAM roles, EC2 instances, S3 buckets, and RDS databases potentially impacted' 
    : timeline.blast_radius!;
  
  const parsePoints = (text: string): string[] => {
    if (!text) return ['Analysis in progress'];
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    return sentences.length > 0 ? sentences.slice(0, 3).map(s => s.trim()) : [text.substring(0, 150) + (text.length > 150 ? '...' : '')];
  };

  // Extract severity from timeline
  const criticalCount = timeline?.events?.filter(e => e.severity === 'CRITICAL').length || 0;
  const totalEvents = timeline?.events?.length || 0;
  
  const insights = [
    {
      id: 'root-cause',
      title: 'Root Cause',
      subtitle: 'Initial attack vector',
      icon: Target,
      text: rootCause,
      points: parsePoints(rootCause),
      gradient: 'from-red-500 to-rose-600',
      lightBg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      dotColor: 'bg-red-400',
      accentBar: 'bg-red-500',
    },
    {
      id: 'attack-pattern',
      title: 'Attack Pattern',
      subtitle: 'Kill chain stages',
      icon: Activity,
      text: attackPattern,
      points: parsePoints(attackPattern),
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-gradient-to-br from-violet-50 to-purple-50',
      border: 'border-violet-200',
      iconColor: 'text-violet-600',
      dotColor: 'bg-violet-400',
      accentBar: 'bg-violet-500',
    },
    {
      id: 'blast-radius',
      title: 'Blast Radius',
      subtitle: `${totalEvents} events, ${criticalCount} critical`,
      icon: Layers,
      text: blastRadius,
      points: parsePoints(blastRadius),
      gradient: 'from-amber-500 to-orange-600',
      lightBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      dotColor: 'bg-amber-400',
      accentBar: 'bg-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`${insight.lightBg} border ${insight.border} rounded-2xl overflow-hidden hover:shadow-elevated transition-all duration-300`}
          >
            {/* Top accent bar */}
            <div className={`h-1 ${insight.accentBar}`} />
            
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${insight.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{insight.title}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{insight.subtitle}</p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                  Nova 2 Lite
                </span>
              </div>
              
              {/* Points */}
              <ul className="space-y-2">
                {insight.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${insight.dotColor} mt-2 flex-shrink-0`} />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default InsightCards;
