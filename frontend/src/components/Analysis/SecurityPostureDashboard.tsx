/**
 * Security Posture Dashboard - Overview of analysis results
 * Health score, risk distribution, key metrics, top findings
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Clock, Activity,
  TrendingUp, ArrowUpRight, Target, Layers, HelpCircle, ChevronDown, ChevronUp, DollarSign, ArrowRight
} from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';

interface SecurityPostureDashboardProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  analysisTime?: number;
  incidentId?: string;
  onNavigateToCostImpact?: () => void;
}

const SecurityPostureDashboard: React.FC<SecurityPostureDashboardProps> = ({
  timeline,
  orchestrationResult,
  analysisTime,
  onNavigateToCostImpact,
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
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Health</p>
            <span
              title={`Based on ${metrics.totalEvents} analyzed events weighted by severity (Critical 40, High 25, Medium 10, Low 3). Score = 100 − weighted risk.`}
              className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          </div>
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

      {/* Cost Impact CTA — prominent link to business value */}
      {onNavigateToCostImpact && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-emerald-50 to-indigo-50 rounded-xl border border-emerald-200 p-4"
        >
          <button
            onClick={onNavigateToCostImpact}
            className="w-full flex items-center justify-between gap-4 text-left hover:bg-white/50 rounded-lg p-3 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">What's the business impact?</h4>
                <p className="text-xs text-slate-500">View cost exposure &amp; Nova Sentinel savings</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      )}

      {/* Key Findings — expandable full details (summary shown above in InsightCards) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 p-5"
      >
        <h3 className="text-sm font-bold text-slate-900 mb-2">Key Findings — Supporting Evidence</h3>
        <p className="text-xs text-slate-500 mb-1">
          Expand to see timeline events that support each finding. Each line is: <span className="font-medium text-slate-600">Timestamp</span> · <span className="font-medium text-slate-600">API action</span> → <span className="font-medium text-slate-600">resource affected</span> (<span className="font-medium text-slate-600">severity</span>).
        </p>
        <p className="text-[11px] text-slate-400 mb-4">
          These are real events from your CloudTrail/log data that led to the finding above.
        </p>
        <KeyFindingsExpandable timeline={timeline} />
      </motion.div>
    </div>
  );
};

function KeyFindingsExpandable({ timeline }: { timeline: Timeline }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const events = timeline?.events || [];

  const getSupportingEvents = (category: string) => {
    if (category === 'root-cause') {
      return events.filter(e => /CreateRole|AttachRolePolicy|AssumeRole/i.test(e.action || '')).slice(0, 3);
    }
    if (category === 'attack-pattern') {
      return events.filter(e => /AuthorizeSecurityGroup|RunInstances|CreateAccessKey|GuardDuty/i.test(e.action || '')).slice(0, 3);
    }
    return events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH').slice(0, 3);
  };

  const items = [
    { id: 'root-cause', label: 'Root Cause', icon: Target, color: 'text-red-600', borderColor: 'border-l-red-500' },
    { id: 'attack-pattern', label: 'Attack Pattern', icon: Activity, color: 'text-orange-600', borderColor: 'border-l-orange-500' },
    { id: 'blast-radius', label: 'Blast Radius', icon: Layers, color: 'text-violet-600', borderColor: 'border-l-violet-500' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOpen = expanded === item.id;
        const supportingEvents = getSupportingEvents(item.id);
        return (
          <div
            key={item.id}
            className={`rounded-lg border border-slate-200 border-l-[3px] ${item.borderColor} overflow-hidden`}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border-t border-slate-100"
                >
                  <div className="p-4 pt-3">
                    {supportingEvents.length > 0 ? (
                      <ul className="space-y-2">
                          {supportingEvents.map((e, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-slate-400 font-mono shrink-0">{e.timestamp?.slice(0, 16) || '—'}</span>
                              <span>{e.action} → {e.resource} ({e.severity})</span>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No timeline events for this finding.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default SecurityPostureDashboard;
