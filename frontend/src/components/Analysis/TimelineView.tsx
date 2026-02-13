/**
 * Timeline View - Premium vertical timeline with MITRE ATT&CK phases
 * Supports sort by severity/time, severity filter, attack/detection markers, connection lines
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, User, Server, AlertCircle, Brain, Zap } from 'lucide-react';
import type { Timeline, TimelineEvent } from '../../types/incident';

interface TimelineViewProps {
  timeline: Timeline;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** Map AWS/CloudTrail actions to MITRE ATT&CK phase labels */
function getMitrePhase(action: string): string {
  const a = (action || '').toLowerCase();
  if (/CreateRole|AttachRolePolicy|AssumeRole/i.test(action)) return 'Privilege Escalation';
  if (/AuthorizeSecurityGroup|RevokeSecurityGroup|ModifySecurityGroup/i.test(action)) return a.includes('authorize') ? 'Initial Access' : 'Defense Evasion';
  if (/DescribeInstances|DescribeVolumes|ListBuckets|GetBucket/i.test(action)) return 'Discovery';
  if (/RunInstances|StartInstances|CreateInstance/i.test(action)) return 'Impact';
  if (/CreateAccessKey|PutUserPolicy|CreateLoginProfile/i.test(action)) return 'Persistence';
  if (/GuardDuty|SecurityHub|Detect/i.test(action)) return 'Detection';
  if (/GetObject|Download|CopyObject|Sync/i.test(action)) return 'Collection';
  if (/PutObject|Upload|CreateBucket/i.test(action)) return 'Exfiltration';
  return 'Execution';
}

const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'severity' | 'time'>('severity');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical-high'>('all');

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedEvents(newExpanded);
  };

  const sortedEvents = useMemo(() => {
    let indexed = timeline.events.map((event, originalIndex) => ({ event, originalIndex }));

    // Apply severity filter
    if (severityFilter === 'critical-high') {
      indexed = indexed.filter(
        ({ event }) => (event.severity as string)?.toUpperCase() === 'CRITICAL' || (event.severity as string)?.toUpperCase() === 'HIGH'
      );
    }

    if (sortBy === 'severity') {
      indexed.sort((a, b) => {
        const aSev = SEVERITY_ORDER[a.event.severity || 'LOW'] ?? 3;
        const bSev = SEVERITY_ORDER[b.event.severity || 'LOW'] ?? 3;
        if (aSev !== bSev) return aSev - bSev;
        const aTime = new Date(a.event.timestamp).getTime();
        const bTime = new Date(b.event.timestamp).getTime();
        return aTime - bTime;
      });
    } else {
      indexed.sort((a, b) => {
        const aTime = new Date(a.event.timestamp).getTime();
        const bTime = new Date(b.event.timestamp).getTime();
        return aTime - bTime;
      });
    }
    return indexed;
  }, [timeline.events, sortBy, severityFilter]);

  const { attackStartedIndex, detectionIndex } = useMemo(() => {
    const byTime = [...timeline.events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const earliest = byTime[0];
    const detection = byTime.find(e => /GuardDuty|SecurityHub|Finding|Detect/i.test(e.action || ''));
    const earliestIdx = earliest ? timeline.events.findIndex(e => e === earliest) : -1;
    const detectionIdx = detection ? timeline.events.findIndex(e => e === detection) : -1;
    return { attackStartedIndex: earliestIdx, detectionIndex: detectionIdx };
  }, [timeline.events]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    timeline.events.forEach(e => {
      const sev = (e.severity || 'MEDIUM') as string;
      if (counts[sev] !== undefined) counts[sev]++;
    });
    return counts;
  }, [timeline.events]);

  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, { bg: string; text: string; border: string; dot: string; ring: string; bar: string }> = {
      CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', ring: 'ring-red-200', bar: 'bg-red-500' },
      HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-200', bar: 'bg-orange-500' },
      MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', ring: 'ring-amber-200', bar: 'bg-amber-400' },
      LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400', ring: 'ring-blue-200', bar: 'bg-blue-400' },
    };
    return styles[severity] || styles.LOW;
  };

  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return timestamp.toString();
      return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return timestamp.toString(); }
  };

  const getSignificance = (event: TimelineEvent) => {
    if (event.significance && event.significance.trim()) return event.significance;
    if (event.details && event.details.trim()) return event.details;
    return 'Security-relevant event in the incident chain.';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        {/* Agent attribution */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-700">Analyzed by TemporalAgent</span>
            <span className="text-[10px] text-indigo-500">(Nova 2 Lite)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Event Timeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {sortedEvents.length}{severityFilter !== 'all' ? ` of ${timeline.events.length}` : ''} events • {(timeline.confidence * 100).toFixed(0)}% confidence
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity filter */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  severityFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSeverityFilter('critical-high')}
                className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  severityFilter === 'critical-high' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Critical & High
              </button>
            </div>
            {/* Sort toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSortBy('severity')}
                className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  sortBy === 'severity' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                By Severity
              </button>
              <button
                onClick={() => setSortBy('time')}
                className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  sortBy === 'time' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                By Time
              </button>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-700">
                {(timeline.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Severity summary bar */}
        <div className="flex items-center gap-4">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
            const styles = getSeverityStyles(sev);
            const count = severityCounts[sev];
            if (count === 0) return null;
            return (
              <div key={sev} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                <span className="text-[11px] font-bold text-slate-600">{count}</span>
                <span className="text-[10px] text-slate-400">{sev}</span>
              </div>
            );
          })}
          <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-slate-100 ml-2">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const styles = getSeverityStyles(sev);
              const count = severityCounts[sev];
              const pct = (count / timeline.events.length) * 100;
              if (pct === 0) return null;
              return <div key={sev} className={`${styles.bar}`} style={{ width: `${pct}%` }} />;
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {/* Vertical connection line - runs through all dots */}
          <div
            className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200"
            style={{ top: 16, bottom: 16 }}
          />

          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {sortedEvents.map(({ event, originalIndex }) => {
                const isExpanded = expandedEvents.has(originalIndex);
                const severity = getSeverityStyles((event.severity as string) || 'MEDIUM');
                const sevLabel = (event.severity as string) || 'MEDIUM';
                const mitrePhase = getMitrePhase(event.action);
                const isAttackStart = originalIndex === attackStartedIndex;
                const isDetection = originalIndex === detectionIndex;

                return (
                  <motion.div
                    key={originalIndex}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative pl-12"
                  >
                    {/* Timeline dot with connection */}
                    <div className="absolute left-0 top-4 flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full ${severity.dot} ring-4 ${severity.ring} ring-opacity-30 shadow-sm z-10`} />
                    </div>

                    {/* Event Card */}
                    <div
                      className={`bg-white border rounded-xl p-4 hover:shadow-card transition-all cursor-pointer ${
                        sevLabel === 'CRITICAL' ? 'border-red-200 hover:border-red-300' :
                        sevLabel === 'HIGH' ? 'border-orange-200 hover:border-orange-300' :
                        'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleEvent(originalIndex)}
                    >
                        <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md ${severity.bg} ${severity.text} ${severity.border} border uppercase tracking-wider`}>
                              {sevLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                              {mitrePhase}
                            </span>
                            {(isAttackStart || isDetection) && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                                isDetection ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-200 text-slate-700 border border-slate-300'
                              }`}>
                                <Zap className="w-2.5 h-2.5" />
                                {isDetection ? 'Detection triggered' : 'Attack started'}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mb-1.5">{event.action}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {event.actor}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Server className="w-3.5 h-3.5 text-slate-400" />
                              {event.resource}
                            </span>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                          >
                            {event.details && event.details.trim() && event.details !== getSignificance(event) && (
                              <div className="mb-3">
                                <p className="text-xs font-bold text-slate-600 mb-1">Details</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{event.details}</p>
                              </div>
                            )}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Security Significance
                              </p>
                              <p className="text-xs text-amber-600 leading-relaxed">{getSignificance(event)}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>

          {sortedEvents.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No events match the current filter. Try &quot;All&quot; to see all events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
