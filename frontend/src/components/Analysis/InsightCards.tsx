/**
 * Wiz.io-Inspired Insight Cards
 * Concise, visual, and easy to scan
 */
import React from 'react';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Timeline } from '../../types/incident';

interface InsightCardsProps {
  timeline: Timeline;
}

const InsightCards: React.FC<InsightCardsProps> = ({ timeline }) => {
  // Extract insights from timeline data
  const rootCause = timeline?.root_cause || 'Security Incident Detected';
  const attackPattern = timeline?.attack_pattern || 'Unknown Attack Pattern';
  const blastRadius = timeline?.blast_radius || 'Impact Assessment Pending';
  
  // Parse root cause into points
  const getRootCausePoints = (text: string): string[] => {
    if (!text) return ['Analysis in progress'];
    // Try to extract key points from the root cause text
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    if (sentences.length > 0) {
      return sentences.slice(0, 3).map(s => s.trim());
    }
    // Fallback: split by common patterns
    if (text.includes('IAM') || text.includes('role')) {
      return ['IAM role compromise detected', 'Unauthorized access identified', 'Excessive privileges granted'];
    }
    if (text.includes('S3') || text.includes('bucket') || text.includes('data')) {
      return ['Unauthorized data access detected', 'Sensitive data exposure identified', 'Data exfiltration attempt'];
    }
    return [text.substring(0, 100) + (text.length > 100 ? '...' : '')];
  };
  
  // Parse attack pattern into points
  const getAttackPatternPoints = (text: string): string[] => {
    if (!text) return ['Pattern analysis in progress'];
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    if (sentences.length > 0) {
      return sentences.slice(0, 3).map(s => s.trim());
    }
    if (text.toLowerCase().includes('exfiltration') || text.toLowerCase().includes('download')) {
      return ['Unauthorized data access', 'Sensitive data download', 'Data breach attempt'];
    }
    if (text.toLowerCase().includes('mining') || text.toLowerCase().includes('crypto')) {
      return ['Cryptocurrency mining deployment', 'Resource abuse detected', 'Unauthorized compute usage'];
    }
    return [text.substring(0, 100) + (text.length > 100 ? '...' : '')];
  };
  
  // Parse blast radius into points
  const getBlastRadiusPoints = (text: string): string[] => {
    if (!text) return ['Impact assessment in progress'];
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    if (sentences.length > 0) {
      return sentences.slice(0, 3).map(s => s.trim());
    }
    // Extract resource count if mentioned
    const resourceMatch = text.match(/(\d+)\s+resource/i);
    if (resourceMatch) {
      return [`${resourceMatch[1]} resources affected`, 'Multiple services impacted', 'Security perimeter breached'];
    }
    return [text.substring(0, 100) + (text.length > 100 ? '...' : '')];
  };
  
  const insights = [
    {
      id: 'root-cause',
      title: 'Root Cause',
      icon: AlertCircle,
      summary: rootCause.length > 50 ? rootCause.substring(0, 50) + '...' : rootCause,
      points: getRootCausePoints(rootCause),
      color: 'indigo',
      bgGradient: 'from-indigo-50 to-blue-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
    },
    {
      id: 'attack-pattern',
      title: 'Attack Pattern',
      icon: TrendingUp,
      summary: attackPattern.length > 50 ? attackPattern.substring(0, 50) + '...' : attackPattern,
      points: getAttackPatternPoints(attackPattern),
      color: 'violet',
      bgGradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
    },
    {
      id: 'blast-radius',
      title: 'Blast Radius',
      icon: Zap,
      summary: blastRadius.length > 50 ? blastRadius.substring(0, 50) + '...' : blastRadius,
      points: getBlastRadiusPoints(blastRadius),
      color: 'purple',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className={`bg-gradient-to-br ${insight.bgGradient} border ${insight.borderColor} rounded-lg p-5 h-full hover:shadow-md transition-all`}>
              {/* Icon and Title */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${insight.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${insight.iconColor}`} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">{insight.title}</h3>
              </div>
              
              {/* Summary */}
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                {insight.summary}
              </h4>
              
              {/* Key Points */}
              <ul className="space-y-1.5">
                {insight.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className={`w-1 h-1 rounded-full ${insight.iconColor.replace('text-', 'bg-')} mt-1.5 flex-shrink-0`} />
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
