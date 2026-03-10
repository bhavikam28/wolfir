/**
 * Event Feed — Premium event list for Live Simulation
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineEvent {
  timestamp: string;
  action: string;
  resource: string;
  severity: string;
}

interface EventFeedProps {
  events: TimelineEvent[];
  visibleCount: number;
}

function formatEventTime(ts: string, prevTs: string | null): string {
  try {
    const d = new Date(ts);
    if (!prevTs) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const prev = new Date(prevTs);
    const days = Math.round((d.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (days >= 1) return `Day +${days}`;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return ts?.slice(11, 19) || '—';
  }
}

const SEV_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  MEDIUM: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  LOW: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export const EventFeed: React.FC<EventFeedProps> = ({ events, visibleCount }) => {
  const visible = events.slice(0, visibleCount);
  let prevTs: string | null = null;

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-600/50 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-white/5">
      <div className="px-4 py-3 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Event Feed</p>
        <p className="text-[9px] text-slate-500 mt-0.5">CloudTrail activity stream — live</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {visible.map((e, i) => {
            const timeStr = formatEventTime(e.timestamp, prevTs);
            prevTs = e.timestamp;
            const sev = (e.severity || 'MEDIUM').toUpperCase();
            const config = SEV_CONFIG[sev] || SEV_CONFIG.MEDIUM;
            return (
              <motion.div
                key={`${e.timestamp}-${e.action}-${i}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`
                  flex flex-col gap-1.5 p-3 rounded-lg border
                  bg-slate-800/50 border-slate-700/50
                  hover:bg-slate-800/70 hover:border-slate-600/50
                  transition-colors duration-200
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums">{timeStr}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${config.bg} ${config.text} ${config.border} ${sev === 'CRITICAL' ? 'animate-pulse' : ''}`}>
                    {sev}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white truncate">{e.action}</p>
                <p className="text-[10px] text-slate-400 truncate">→ {e.resource}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
