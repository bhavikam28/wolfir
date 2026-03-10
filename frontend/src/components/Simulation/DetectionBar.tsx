/**
 * Detection Bar — Premium Nova pipeline visualization for Live Simulation
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Brain, Gauge, Shield, CheckCircle2 } from 'lucide-react';

type Step = 'detecting' | 'temporal' | 'risk' | 'remediation' | 'contained';

interface DetectionBarProps {
  step: Step;
}

const STEPS: { id: Step; label: string; model?: string; status: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'detecting', label: 'Detecting', status: 'Correlating CloudTrail events across time windows…', icon: Search },
  { id: 'temporal', label: 'Temporal Agent', model: 'Nova 2 Lite', status: 'Analyzing attack sequence and blast radius…', icon: Brain },
  { id: 'risk', label: 'Risk Scorer', model: 'Nova Micro', status: 'Calculating risk score and MITRE mapping…', icon: Gauge },
  { id: 'remediation', label: 'Remediation', model: 'Nova 2 Lite', status: 'Executing autonomous containment actions…', icon: Shield },
  { id: 'contained', label: 'Contained', status: 'Incident neutralized. Sessions revoked, resources secured.', icon: CheckCircle2 },
];

export const DetectionBar: React.FC<DetectionBarProps> = ({ step }) => {
  const idx = STEPS.findIndex((s) => s.id === step);
  const activeIdx = idx >= 0 ? idx : 0;

  const currentStep = STEPS[activeIdx];

  return (
    <div className="border-t border-slate-700/60 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 backdrop-blur-md flex flex-col px-6 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
      {/* What Nova is doing — live status */}
      <p className="text-[10px] text-slate-400 text-center mb-2 font-medium">
        {currentStep?.status}
      </p>
      <div className="flex items-center gap-2 flex-1 max-w-4xl mx-auto">
        {STEPS.map((s, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const isContained = s.id === 'contained';
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.05 : 1,
                  opacity: 1,
                }}
                transition={{ duration: 0.3 }}
                className={`
                  flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all duration-300
                  ${isActive
                    ? isContained
                      ? 'bg-slate-800/80 border-emerald-500/40 shadow-sm'
                      : 'bg-indigo-500/20 border-indigo-400/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-800/40 border-slate-600/50'
                  }
                  ${isCurrent && !isContained ? 'ring-2 ring-indigo-400/40' : ''}
                `}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isActive ? (isContained ? 'bg-emerald-500/20 border border-emerald-400/30' : 'bg-indigo-500/30') : 'bg-slate-700/50'}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? (isContained ? 'text-emerald-400' : 'text-indigo-400') : 'text-slate-500'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${isActive ? (isContained ? 'text-emerald-400' : 'text-indigo-300') : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                  {s.model && isCurrent && !isContained && (
                    <span className="text-[9px] text-slate-400">{s.model}</span>
                  )}
                </div>
              </motion.div>
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0.3 }}
                  className={`w-4 h-0.5 rounded ${isActive ? 'bg-indigo-500/80' : 'bg-slate-600'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
