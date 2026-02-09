/**
 * Premium Timeline Component - Light Mode (Wiz.io Style)
 * Vertical timeline with expandable events
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, User, Server, AlertCircle } from 'lucide-react';
import type { Timeline, TimelineEvent } from '../../types/incident';
import { formatAnalysisTime } from '../../utils/formatting';

interface TimelineViewProps {
  timeline: Timeline;
}

const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
        };
      default:
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
        };
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) {
        return timestamp.toString();
      }
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return timestamp.toString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Detailed Timeline</h3>
          <p className="text-slate-600">
            {timeline.events.length} events analyzed with{' '}
            <span className="font-semibold text-indigo-600">
              {(timeline.confidence * 100).toFixed(0)}% confidence
            </span>
          </p>
        </div>
        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm font-semibold text-green-700">
            {(timeline.confidence * 100).toFixed(0)}% Confidence
          </span>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {timeline.events.map((event, index) => {
            const isExpanded = expandedEvents.has(index);
            const badge = getSeverityBadge(event.severity || 'MEDIUM');
            const isLast = index === timeline.events.length - 1;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative pl-12"
              >
                {/* Timeline dot */}
                <div className="absolute left-4 top-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      event.severity === 'CRITICAL'
                        ? 'bg-red-500'
                        : event.severity === 'HIGH'
                        ? 'bg-orange-500'
                        : event.severity === 'MEDIUM'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  />
                </div>

                {/* Event Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {event.severity || 'MEDIUM'}
                        </span>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 mb-1">
                        {event.action}
                      </h4>
                    </div>
                    <button
                      onClick={() => toggleEvent(index)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Actor:</span>
                      <span>{event.actor}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Server className="w-4 h-4" />
                      <span className="font-medium">Resource:</span>
                      <span>{event.resource}</span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-slate-200"
                      >
                        {event.details && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Details:</p>
                            <p className="text-sm text-slate-600">{event.details}</p>
                          </div>
                        )}
                        {event.significance && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Significance:
                            </p>
                            <p className="text-sm text-slate-600">{event.significance}</p>
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
  );
};

export default TimelineView;
