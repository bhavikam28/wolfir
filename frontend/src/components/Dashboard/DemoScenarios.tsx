/**
 * Premium Demo Scenarios Component - Stunning Modern SaaS Design
 * Interactive, animated, and visually engaging
 */
import React from 'react';
import { Database, Zap, ArrowRight, Brain, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DemoScenario } from '../../types/incident';

interface DemoScenariosProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  loading?: boolean;
}

const DemoScenarios: React.FC<DemoScenariosProps> = ({ 
  scenarios, 
  onSelectScenario,
  loading 
}) => {
  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'crypto-mining':
        return Zap;
      case 'data-exfiltration':
        return Database;
      case 'privilege-escalation':
        return TrendingUp;
      case 'unauthorized-access':
        return AlertCircle;
      default:
        return Shield;
    }
  };

  const getScenarioConfig = (scenario: DemoScenario) => {
    if (scenario.severity === 'CRITICAL') {
      return {
        gradientFrom: 'from-red-50',
        gradientVia: 'via-pink-50',
        gradientTo: 'to-purple-50',
        borderColor: 'border-red-300',
        buttonGradient: 'from-red-500 to-pink-600',
        iconGradient: 'from-red-500 to-pink-600',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700',
        badgeBorder: 'border-red-200',
        emoji: '🚨',
      };
    } else if (scenario.severity === 'HIGH') {
      return {
        gradientFrom: 'from-orange-50',
        gradientVia: 'via-amber-50',
        gradientTo: 'to-yellow-50',
        borderColor: 'border-orange-300',
        buttonGradient: 'from-orange-500 to-amber-600',
        iconGradient: 'from-orange-500 to-amber-600',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-700',
        badgeBorder: 'border-orange-200',
        emoji: '⚠️',
      };
    }
    return {
      gradientFrom: 'from-blue-50',
      gradientVia: 'via-indigo-50',
      gradientTo: 'to-purple-50',
      borderColor: 'border-blue-300',
      buttonGradient: 'from-blue-500 to-indigo-600',
      iconGradient: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-200',
      emoji: 'ℹ️',
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-200 mb-6">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-sm font-medium text-indigo-700">
              Live Demo
            </span>
          </div>
          
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Experience Nova Sentinel
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              In Action
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Select a real-world security scenario and watch Nova Sentinel 
            analyze, investigate, and resolve it autonomously in under 1 minute.
          </p>
        </motion.div>

                {/* Scenario Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {scenarios.map((scenario, index) => {
            const Icon = getScenarioIcon(scenario.id);
            const config = getScenarioConfig(scenario);
            
            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                onClick={() => !loading && onSelectScenario(scenario.id)}
                className={`group relative bg-white rounded-3xl p-8 border-2 border-slate-200 hover:${config.borderColor} hover:shadow-2xl transition-all cursor-pointer overflow-hidden ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Animated gradient background */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo}`}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                <div className="relative">
                  {/* Severity Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`px-4 py-2 ${config.badgeBg} ${config.badgeText} text-sm font-bold rounded-full border-2 ${config.badgeBorder}`}>
                      {config.emoji} {scenario.severity}
                    </div>
                    <div className="text-sm text-slate-500">
                      {scenario.event_count} CloudTrail events
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.iconGradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {scenario.name}
                  </h3>
                  
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    {scenario.description}
                  </p>
                  
                  {/* CTA Button */}
                  <button 
                    disabled={loading}
                    className={`w-full px-6 py-4 bg-gradient-to-r ${config.buttonGradient} text-white font-semibold rounded-xl hover:shadow-xl transition-all flex items-center justify-between group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>Analyze This Incident</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Zap, label: 'Under 1 Minute', value: 'Resolution Time' },
            { icon: Brain, label: '5 Nova Models', value: 'Working Together' },
            { icon: Shield, label: '100% Automated', value: 'No Manual Work' },
            { icon: TrendingUp, label: '95% Confidence', value: 'AI Accuracy' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 text-center hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {item.label}
              </div>
              <div className="text-sm text-slate-600">{item.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemoScenarios;
