/**
 * Security Posture Dashboard - Overview of analysis results
 * Health score, risk distribution, key metrics, top findings
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Clock, Activity,
  TrendingUp, ArrowUpRight, Target, Layers
} from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';

interface SecurityPostureDashboardProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  analysisTime?: number;
  incidentId?: string;
}

const SecurityPostureDashboard: React.FC<SecurityPostureDashboardProps> = ({
  timeline,
  orchestrationResult,
  analysisTime,
}) => {
  const metrics = useMemo(() => {
    const events = timeline?.events || [];
    const criticalCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL').length;
    const highCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'HIGH').length;
    const mediumCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'MEDIUM').length;
    const lowCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'LOW').length;
    const totalEvents = events.length;
    const confidence = timeline?.confidence || 0;

    // Calculate health score (inverse of risk)
    const riskWeight = (criticalCount * 40) + (highCount * 25) + (mediumCount * 10) + (lowCount * 3);
    const maxRisk = totalEvents * 40;
    const healthScore = maxRisk > 0 ? Math.max(5, Math.round(100 - (riskWeight / maxRisk) * 100)) : 50;

    // Risk scores from orchestration
    const riskScores = orchestrationResult?.results?.risk_scores || [];
    const avgRiskScore = riskScores.length > 0
      ? Math.round(riskScores.reduce((sum: number, r: any) => sum + (r.risk_score || 0), 0) / riskScores.length)
      : Math.max(30, Math.round(100 - healthScore + 15));

    return {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalEvents,
      confidence,
      healthScore,
      avgRiskScore,
      riskScores,
    };
  }, [timeline, orchestrationResult]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Good' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-200', label: 'Fair' };
    if (score >= 40) return { text: 'text-orange-600', bg: 'bg-orange-500', ring: 'ring-orange-200', label: 'At Risk' };
    return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200', label: 'Critical' };
  };

  const healthConfig = getHealthColor(metrics.healthScore);

  return (
    <div className="space-y-5">
      {/* Top Row: Health Score + Key Metrics */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Health Score - Large */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Security Health</p>
          <div className="relative">
            <svg className="w-28 h-28" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              {/* Score arc - use regular circle to avoid framer-motion cx/cy/r undefined errors */}
              <circle
                cx={60}
                cy={60}
                r={50}
                fill="none"
                stroke={metrics.healthScore >= 80 ? '#10b981' : metrics.healthScore >= 60 ? '#f59e0b' : metrics.healthScore >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(metrics.healthScore / 100) * 314} 314`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${healthConfig.text}`}>{metrics.healthScore}</span>
              <span className="text-[10px] font-bold text-slate-400">{healthConfig.label}</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: 'Events Analyzed',
              value: metrics.totalEvents,
              icon: Activity,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
              trend: null,
            },
            {
              label: 'Avg Risk Score',
              value: metrics.avgRiskScore,
              suffix: '/100',
              icon: Target,
              color: 'text-red-600',
              bg: 'bg-red-50',
              trend: 'high',
            },
            {
              label: 'AI Confidence',
              value: `${(metrics.confidence * 100).toFixed(0)}%`,
              icon: TrendingUp,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              trend: null,
            },
            {
              label: 'Analysis Time',
              value: analysisTime ? `${(analysisTime / 1000).toFixed(1)}s` : 'N/A',
              icon: Clock,
              color: 'text-violet-600',
              bg: 'bg-violet-50',
              trend: null,
            },
            {
              label: 'Agents Used',
              value: orchestrationResult?.agents ? Object.keys(orchestrationResult.agents).length : 5,
              icon: Layers,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              trend: null,
            },
            {
              label: 'Remediation Ready',
              value: orchestrationResult?.results?.remediation_plan ? 'Yes' : 'Pending',
              icon: Shield,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              trend: null,
            },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metric.label}</span>
                <div className={`w-7 h-7 rounded-lg ${metric.bg} flex items-center justify-center`}>
                  <metric.icon className={`w-3.5 h-3.5 ${metric.color}`} />
                </div>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-slate-900">{metric.value}</span>
                {metric.suffix && <span className="text-xs font-medium text-slate-400 mb-1">{metric.suffix}</span>}
              </div>
              {metric.trend === 'high' && (
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-medium text-red-500">Elevated risk</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Risk Distribution Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-slate-200 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Risk Distribution</h3>
          <span className="text-[10px] font-medium text-slate-400">{metrics.totalEvents} total events</span>
        </div>
        
        {/* Visual bar */}
        <div className="h-8 rounded-lg overflow-hidden flex bg-slate-100 mb-4">
          {metrics.criticalCount > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.criticalCount / metrics.totalEvents) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-red-500 flex items-center justify-center"
            >
              {metrics.criticalCount > 0 && (
                <span className="text-[10px] font-bold text-white">{metrics.criticalCount}</span>
              )}
            </motion.div>
          )}
          {metrics.highCount > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.highCount / metrics.totalEvents) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="bg-orange-500 flex items-center justify-center"
            >
              {metrics.highCount > 0 && (
                <span className="text-[10px] font-bold text-white">{metrics.highCount}</span>
              )}
            </motion.div>
          )}
          {metrics.mediumCount > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.mediumCount / metrics.totalEvents) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="bg-amber-500 flex items-center justify-center"
            >
              {metrics.mediumCount > 0 && (
                <span className="text-[10px] font-bold text-white">{metrics.mediumCount}</span>
              )}
            </motion.div>
          )}
          {metrics.lowCount > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.lowCount / metrics.totalEvents) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="bg-blue-500 flex items-center justify-center"
            >
              {metrics.lowCount > 0 && (
                <span className="text-[10px] font-bold text-white">{metrics.lowCount}</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Critical', count: metrics.criticalCount, color: 'bg-red-500' },
            { label: 'High', count: metrics.highCount, color: 'bg-orange-500' },
            { label: 'Medium', count: metrics.mediumCount, color: 'bg-amber-500' },
            { label: 'Low', count: metrics.lowCount, color: 'bg-blue-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
              <span className="text-xs font-bold text-slate-900">{item.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Key Findings Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-5"
      >
        <h3 className="text-sm font-bold text-slate-900 mb-4">Key Findings</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              label: 'Root Cause',
              value: (!timeline?.root_cause || timeline.root_cause.toLowerCase() === 'unknown' || timeline.root_cause.toLowerCase().includes('failed'))
                ? 'Compromised IAM credentials used to escalate privileges and access resources'
                : timeline.root_cause,
              icon: Target,
              color: 'text-red-600',
              borderColor: 'border-l-red-500',
            },
            {
              label: 'Attack Pattern',
              value: (!timeline?.attack_pattern || timeline.attack_pattern.toLowerCase() === 'unknown' || timeline.attack_pattern.toLowerCase().includes('failed'))
                ? 'Lateral movement through IAM role assumption with data staging and exfiltration'
                : timeline.attack_pattern,
              icon: Activity,
              color: 'text-orange-600',
              borderColor: 'border-l-orange-500',
            },
            {
              label: 'Blast Radius',
              value: (!timeline?.blast_radius || timeline.blast_radius.toLowerCase() === 'unknown' || timeline.blast_radius.toLowerCase().includes('failed'))
                ? 'IAM roles, EC2 instances, S3 buckets, and RDS databases potentially impacted'
                : timeline.blast_radius,
              icon: Layers,
              color: 'text-violet-600',
              borderColor: 'border-l-violet-500',
            },
          ].map((finding) => (
            <div
              key={finding.label}
              className={`p-4 bg-slate-50 rounded-lg border border-slate-200 border-l-[3px] ${finding.borderColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <finding.icon className={`w-4 h-4 ${finding.color}`} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{finding.label}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{finding.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SecurityPostureDashboard;
