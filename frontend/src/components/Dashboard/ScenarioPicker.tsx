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
}

const SCENARIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'crypto-mining': Zap,
  'data-exfiltration': AlertTriangle,
  'privilege-escalation': Lock,
  'unauthorized-access': Shield,
};

const getSeverityConfig = (severity: string) => {
  const configs: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  };
  return configs[severity] || configs.MEDIUM;
};

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  onSelectScenario,
  loading,
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
                <div className={`w-11 h-11 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.text}`} />
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

      {/* Info */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-600 leading-relaxed">
          Each scenario runs through the full 5-agent Nova AI pipeline: Detection (Nova Pro), Investigation (Nova 2 Lite), Classification (Nova Micro), Remediation (Orchestrator), and Documentation (Nova 2 Lite).
        </p>
      </div>
    </div>
  );
};

export default ScenarioPicker;
