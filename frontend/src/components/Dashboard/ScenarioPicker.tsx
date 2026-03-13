/**
 * Scenario Picker - Clean scenario selection for demo mode
 * Shows inside the main content area when no analysis is running
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Shield, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import type { DemoScenario } from '../../types/incident';

interface ScenarioPickerProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  onStartSimulation?: (scenarioId: string) => void;
  loading?: boolean;
  useFullAI?: boolean;
  onUseFullAIChange?: (v: boolean) => void;
}

const SvgIcon = ({ children, className = 'w-5 h-5' }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const SCENARIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'crypto-mining': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 6h8M8 12h8M8 18h4" /></SvgIcon>,
  'data-exfiltration': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></SvgIcon>,
  'privilege-escalation': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></SvgIcon>,
  'unauthorized-access': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></SvgIcon>,
  'shadow-ai': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><path d="M12 2a2 2 0 012 2v1a2 2 0 01-2 2h-1" /><path d="M12 8v4" /><path d="M8 16h8" /><path d="M4 12a8 8 0 0116 0" /></SvgIcon>,
};

/* Premium minimal palette — indigo/slate only (no red/orange) */
const getSeverityConfig = (severity: string) => {
  const configs: Record<string, { bg: string; text: string; border: string; dot: string; iconBg: string }> = {
    CRITICAL: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', dot: 'bg-indigo-600', iconBg: 'bg-slate-100 border border-slate-200' },
    HIGH: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-indigo-500', iconBg: 'bg-slate-100 border border-slate-200' },
    MEDIUM: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-indigo-400', iconBg: 'bg-slate-50 border border-slate-200' },
    LOW: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', iconBg: 'bg-slate-50 border border-slate-200' },
  };
  return configs[severity] || configs.MEDIUM;
};

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  onSelectScenario,
  onStartSimulation,
  loading,
  useFullAI = false,
  onUseFullAIChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Training Mode — What-If Scenarios</h2>
        <p className="text-sm text-slate-500">
          Run tabletop exercises: explore attack paths, blast radius, and Nova&apos;s response with different parameters. Unlike the Attack Path (real incidents), this is for training and what-if analysis.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-3">
        {scenarios.map((scenario, index) => {
          const config = getSeverityConfig(scenario.severity);
          const Icon = SCENARIO_ICONS[scenario.id] || SCENARIO_ICONS['crypto-mining'];

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group w-full bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
            >
              <button
                onClick={() => !loading && onSelectScenario(scenario.id)}
                disabled={loading}
                className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  {/* Icon — minimal */}
                  <div className={`w-11 h-11 rounded-xl ${(config as any).iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {scenario.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text} ${config.border} border`}>
                        {scenario.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{scenario.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{scenario.event_count} CloudTrail events</p>
                  </div>

                  {/* Arrow */}
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Run What-If Simulation */}
              {onStartSimulation && !loading && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStartSimulation(scenario.id); }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 rounded-md border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
                  title="Run what-if training simulation with adjustable parameters"
                >
                  <Play className="w-3 h-3" strokeWidth={2.5} />
                  Run What-If
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mode toggle — clear labels for judges */}
      {onUseFullAIChange && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Demo mode:</span>
              <span
                className="text-slate-400 hover:text-slate-600 cursor-help"
                title="Instant Demo: Pre-computed results, no backend needed — works on Vercel. Full AI: Live Bedrock pipeline (~45s) — requires backend running locally."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => onUseFullAIChange(false)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  !useFullAI ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Pre-computed results, no backend needed — works on Vercel"
              >
                Instant Demo (no backend needed)
              </button>
              <button
                type="button"
                onClick={() => onUseFullAIChange(true)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  useFullAI ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Live Bedrock pipeline (~45s) — requires backend running locally"
              >
                Full AI (requires backend running)
              </button>
            </div>
          </div>
          {useFullAI && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                This calls live Bedrock APIs and takes ~45 seconds. Requires backend running.
              </p>
            </div>
          )}
        </div>
      )}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-600 leading-relaxed">
          {useFullAI
            ? 'Full 5-agent Nova AI pipeline: Detection (Nova Pro), Investigation (Nova 2 Lite), Classification (Nova Micro), Remediation, Documentation.'
            : 'Instant demo uses pre-computed results. Switch to "Full AI" above to run the full Nova pipeline (~45s).'}
        </p>
      </div>
    </div>
  );
};

export default ScenarioPicker;
