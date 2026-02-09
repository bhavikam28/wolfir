/**
 * Timeline View - Premium vertical timeline sorted by severity
 * CRITICAL → HIGH → MEDIUM → LOW ordering with expandable events
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, User, Server, AlertCircle } from 'lucide-react';
import type { Timeline } from '../../types/incident';

interface TimelineViewProps {
  timeline: Timeline;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'severity' | 'time'>('severity');

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedEvents(newExpanded);
  };

  const sortedEvents = useMemo(() => {
    const indexed = timeline.events.map((event, originalIndex) => ({ event, originalIndex }));
    if (sortBy === 'severity') {
      indexed.sort((a, b) => {
        const aSev = SEVERITY_ORDER[a.event.severity || 'LOW'] ?? 3;
        const bSev = SEVERITY_ORDER[b.event.severity || 'LOW'] ?? 3;
        if (aSev !== bSev) return aSev - bSev;
        // Within same severity, sort by time
        const aTime = new Date(a.event.timestamp).getTime();
        const bTime = new Date(b.event.timestamp).getTime();
        return aTime - bTime;
      });
    }
    return indexed;
  }, [timeline.events, sortBy]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    timeline.events.forEach(e => {
      const sev = e.severity || 'MEDIUM';
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Event Timeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeline.events.length} events • {(timeline.confidence * 100).toFixed(0)}% confidence
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          {/* Mini progress bar */}
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
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-3">
            {sortedEvents.map(({ event, originalIndex }, displayIndex) => {
              const isExpanded = expandedEvents.has(originalIndex);
              const severity = getSeverityStyles(event.severity || 'MEDIUM');
              const sevLabel = event.severity || 'MEDIUM';

              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: displayIndex * 0.02 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-3 top-4">
                    <div className={`w-4 h-4 rounded-full ${severity.dot} ring-4 ${severity.ring} ring-opacity-30 shadow-sm`} />
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
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md ${severity.bg} ${severity.text} ${severity.border} border uppercase tracking-wider`}>
                            {sevLabel}
                          </span>
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
                          className="mt-3 pt-3 border-t border-slate-100"
                        >
                          {event.details && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-slate-600 mb-1">Details</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{event.details}</p>
                            </div>
                          )}
                          {event.significance && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Security Significance
                              </p>
                              <p className="text-xs text-amber-600 leading-relaxed">{event.significance}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
