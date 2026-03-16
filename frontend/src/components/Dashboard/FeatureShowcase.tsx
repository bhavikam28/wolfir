/**
 * Feature Showcase - Clear feature dashboard with named features
 * Shows all platform capabilities before analysis begins
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Eye, GitBranch, Scale, DollarSign, Mic,
  Image, Cloud, ArrowRight, Loader2, ChevronDown, Play, Sparkles
} from 'lucide-react';
import type { DemoScenario } from '../../types/incident';

interface FeatureShowcaseProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  onConnectAWS?: () => void;
  loading?: boolean;
  awsTab?: React.ReactNode;
}

interface Feature {
  id: string;
  number: number;
  name: string;
  description: string;
  model: string;
  modelColor: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  available: 'always' | 'after-analysis' | 'scenarios';
}

const FEATURES: Feature[] = [
  {
    id: 'threat-detection',
    number: 1,
    name: 'Threat Detection Pipeline',
    description: 'Multi-agent AI pipeline detects, investigates, classifies, and documents security incidents autonomously.',
    model: '7 Nova Capabilities',
    modelColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    icon: Shield,
    gradient: 'from-indigo-500 to-violet-600',
    available: 'scenarios',
  },
  {
    id: 'attack-path',
    number: 2,
    name: 'Attack Path Visualization',
    description: 'Interactive attack chain diagrams trace threat propagation across your AWS environment with zoom and detail views.',
    model: 'Nova Pro',
    modelColor: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: GitBranch,
    gradient: 'from-blue-500 to-cyan-500',
    available: 'after-analysis',
  },
  {
    id: 'compliance',
    number: 3,
    name: 'Compliance Mapping',
    description: 'Auto-maps findings to CIS Benchmarks, NIST 800-53, SOC 2, and PCI-DSS with remediation commands.',
    model: 'Nova 2 Lite',
    modelColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: Scale,
    gradient: 'from-emerald-500 to-teal-500',
    available: 'after-analysis',
  },
  {
    id: 'cost-impact',
    number: 4,
    name: 'Cost Impact Estimation',
    description: 'Calculates financial exposure, breach liability, downtime costs, and wolfir ROI with cited sources.',
    model: 'Nova 2 Lite',
    modelColor: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: DollarSign,
    gradient: 'from-amber-500 to-orange-500',
    available: 'after-analysis',
  },
  {
    id: 'remediation',
    number: 5,
    name: 'AI Remediation Engine',
    description: 'Generates prioritized remediation steps with AWS CLI commands, automated via Nova Act browser automation.',
    model: 'Nova Act',
    modelColor: 'text-rose-600 bg-rose-50 border-rose-200',
    icon: Eye,
    gradient: 'from-rose-500 to-pink-500',
    available: 'after-analysis',
  },
  {
    id: 'aria-voice',
    number: 6,
    name: 'Aria — Voice Security Assistant',
    description: 'Ask questions about incidents using voice or text. Aria explains findings, recommends actions, and walks you through results.',
    model: 'Nova 2 Lite',
    modelColor: 'text-violet-600 bg-violet-50 border-violet-200',
    icon: Mic,
    gradient: 'from-violet-500 to-purple-600',
    available: 'always',
  },
  {
    id: 'visual-analysis',
    number: 7,
    name: 'Visual Architecture Analysis',
    description: 'Upload AWS architecture diagrams for AI-powered security assessment of your infrastructure design.',
    model: 'Nova Pro',
    modelColor: 'text-sky-600 bg-sky-50 border-sky-200',
    icon: Image,
    gradient: 'from-sky-500 to-blue-500',
    available: 'always',
  },
  {
    id: 'similar-incidents',
    number: 8,
    name: 'Similar Incidents (Nova Embeddings)',
    description: 'Semantic search over incident history. Find incidents similar to the current one using Nova Multimodal Embeddings.',
    model: 'Nova Embeddings',
    modelColor: 'text-violet-600 bg-violet-50 border-violet-200',
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
    available: 'after-analysis',
  },
  {
    id: 'real-aws',
    number: 9,
    name: 'Real AWS Account Analysis',
    description: 'Connect via aws login or CLI profile for real CloudTrail analysis — OAuth, no keys stored. SSO via profiles.',
    model: 'All Models',
    modelColor: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: Cloud,
    gradient: 'from-orange-500 to-red-500',
    available: 'always',
  },
];

const getSeverityConfig = (severity: string) => {
  const configs: Record<string, { border: string; badge: string }> = {
    CRITICAL: { border: 'border-l-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
    HIGH: { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    MEDIUM: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    LOW: { border: 'border-l-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  return configs[severity] || configs.MEDIUM;
};

const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  scenarios,
  onSelectScenario,
  onConnectAWS: _onConnectAWS,
  loading,
  awsTab,
}) => {
  const [expandedFeature, setExpandedFeature] = useState<string | null>('threat-detection');
  const [showAWS, setShowAWS] = useState(false);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black text-slate-900 mb-1">Platform Features</h2>
        <p className="text-sm text-slate-500">9 distinct capabilities powered by Amazon Nova AI models</p>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {FEATURES.map((feature, index) => {
          const isExpanded = expandedFeature === feature.id;
          const isScenarioFeature = feature.id === 'threat-detection';
          const isAWSFeature = feature.id === 'real-aws';

          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 ${
                isExpanded ? 'ring-2 ring-indigo-200 shadow-lg' : 'hover:shadow-md hover:border-slate-300'
              }`}
            >
              {/* Feature Header */}
              <button
                onClick={() => {
                  if (isScenarioFeature || isAWSFeature) {
                    setExpandedFeature(isExpanded ? null : feature.id);
                    if (isAWSFeature) setShowAWS(!showAWS);
                  }
                }}
                className="w-full text-left p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Feature number + icon */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-sm`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-600">{feature.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{feature.name}</h3>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${feature.modelColor} flex-shrink-0`}>
                        {feature.model}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                    
                    {/* Status indicator */}
                    <div className="mt-2 flex items-center gap-2">
                      {feature.available === 'scenarios' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                          <Play className="w-3 h-3" /> Select scenario below
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      )}
                      {feature.available === 'after-analysis' && (
                        <span className="text-[10px] font-medium text-slate-400">Unlocks after running analysis</span>
                      )}
                      {feature.available === 'always' && !isAWSFeature && (
                        <span className="text-[10px] font-medium text-emerald-600">Available anytime</span>
                      )}
                      {isAWSFeature && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                          <Cloud className="w-3 h-3" /> Connect your account
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  {(isScenarioFeature || isAWSFeature) && (
                    <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </button>

              {/* Expanded: Scenario selection */}
              <AnimatePresence>
                {isExpanded && isScenarioFeature && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-4 mb-3">
                        Choose a Demo Scenario
                      </p>
                      <div className="space-y-2">
                        {scenarios.map((scenario) => {
                          const config = getSeverityConfig(scenario.severity);
                          return (
                            <button
                              key={scenario.id}
                              onClick={() => !loading && onSelectScenario(scenario.id)}
                              disabled={loading}
                              className={`w-full group text-left p-3 rounded-lg border border-slate-200 border-l-[3px] ${config.border} hover:shadow-sm hover:border-slate-300 transition-all disabled:opacity-50`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {scenario.name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.badge}`}>
                                    {scenario.severity}
                                  </span>
                                </div>
                                {loading ? (
                                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {scenario.description} · {scenario.event_count} events
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {isExpanded && isAWSFeature && awsTab && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-0">
                      <div className="mt-4">
                        {awsTab}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureShowcase;
