/**
 * Demo Checklist — Collapsible panel for demo flows
 * Tracks: Run scenario → Show timeline → Show remediation → Show AI security → Show incident history
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';

interface DemoChecklistProps {
  runScenarioDone: boolean;
  visitedFeatures: Set<string>;
  activeFeature: string;
  onNavigate: (featureId: string) => void;
}

const ITEMS: { id: string; label: string; featureId: string }[] = [
  { id: 'run', label: 'Run scenario', featureId: 'overview' },
  { id: 'timeline', label: 'Show timeline', featureId: 'timeline' },
  { id: 'attack-path', label: 'Show attack path', featureId: 'attack-path' },
  { id: 'remediation', label: 'Show remediation', featureId: 'remediation' },
  { id: 'protocol', label: 'IR Protocol (NIST)', featureId: 'protocol' },
  { id: 'ai-security', label: 'Show AI security', featureId: 'ai-pipeline' },
  { id: 'aria', label: 'Try Aria voice', featureId: 'aria' },
  { id: 'export', label: 'Export report', featureId: 'export' },
  { id: 'incident-history', label: 'Show incident history', featureId: 'incident-history' },
];

export default function DemoChecklist({
  runScenarioDone,
  visitedFeatures,
  activeFeature,
  onNavigate,
}: DemoChecklistProps) {
  const [expanded, setExpanded] = useState(false);

  const isDone = (item: (typeof ITEMS)[0]) => {
    if (item.id === 'run') return runScenarioDone;
    return visitedFeatures.has(item.featureId);
  };

  const doneCount = ITEMS.filter(isDone).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-slate-600" strokeWidth={1.8} />
          <span className="text-xs font-bold text-slate-800">Demo Checklist</span>
          <span className="text-[10px] font-semibold text-slate-600">
            {doneCount}/{ITEMS.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-1">
              {ITEMS.map((item) => {
                const done = isDone(item);
                const isCurrent = activeFeature === item.featureId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.featureId)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                      isCurrent ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" strokeWidth={1.8} />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.8} />
                    )}
                    <span className={done ? 'line-through text-violet-600' : ''}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
