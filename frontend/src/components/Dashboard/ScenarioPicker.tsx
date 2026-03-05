/**
 * Scenario Picker - Clean scenario selection for demo mode
 * Shows inside the main content area when no analysis is running
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Shield, Zap, AlertTriangle, Lock } from 'lucide-react';
import type { DemoScenario } from '../../types/incident';

interface ScenarioPickerProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  loading?: boolean;
  useFullAI?: boolean;
  onUseFullAIChange?: (v: boolean) => void;
}

const SCENARIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'crypto-mining': Zap,
  'data-exfiltration': AlertTriangle,
  'privilege-escalation': Lock,
  'unauthorized-access': Shield,
};

const getSeverityConfig = (severity: string) => {
  const configs: Record<string, { bg: string; text: string; border: string; dot: string; iconBg: string }> = {
    CRITICAL: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600' },
    HIGH: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
    MEDIUM: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500', iconBg: 'bg-gradient-to-br from-sky-500 to-cyan-500' },
    LOW: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500' },
  };
  return configs[severity] || configs.MEDIUM;
};

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  onSelectScenario,
  loading,
  useFullAI = false,
  onUseFullAIChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Select a Scenario</h2>
        <p className="text-sm text-slate-500">
          Choose a simulated AWS security incident to analyze with the multi-agent pipeline.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-3">
        {scenarios.map((scenario, index) => {
          const config = getSeverityConfig(scenario.severity);
          const Icon = SCENARIO_ICONS[scenario.id] || Shield;

          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !loading && onSelectScenario(scenario.id)}
              disabled={loading}
              className="group w-full text-left bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${(config as any).iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
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
            </motion.button>
          );
        })}
      </div>

      {/* Mode toggle & Info */}
      {onUseFullAIChange && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-600">Default: instant demo (~2s). Toggle for full Nova AI:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFullAI}
                onChange={(e) => onUseFullAIChange(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-700">Use full AI analysis</span>
            </label>
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
            : 'Instant demo uses pre-computed results. Enable "Use full AI analysis" above to run the full Nova pipeline (~45s).'}
        </p>
      </div>
    </div>
  );
};

export default ScenarioPicker;
