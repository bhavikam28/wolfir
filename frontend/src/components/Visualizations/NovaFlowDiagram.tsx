/**
 * Professional Nova Flow Diagram - Wiz Quality
 * Clean, symmetrical, perfectly aligned
 */
import React from 'react';
import { Eye, Brain, Zap, Mic, FileText, ArrowRight, Shield } from 'lucide-react';

const NovaFlowDiagram: React.FC = () => {
  const steps = [
    {
      icon: Eye,
      title: 'Visual Analysis',
      model: 'Nova Pro',
      description: 'Analyzes architecture diagrams',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'Temporal Reasoning',
      model: 'Nova 2 Lite',
      description: 'Builds attack timeline',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Zap,
      title: 'Risk Scoring',
      model: 'Nova Micro',
      description: 'Real-time classification',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Mic,
      title: 'Voice Interface',
      model: 'Nova 2 Sonic',
      description: 'Hands-free commands',
      color: 'from-green-500 to-teal-500',
    },
    {
      icon: FileText,
      title: 'Documentation',
      model: 'Nova Act',
      description: 'Automated reports',
      color: 'from-indigo-500 to-purple-500',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-professional-lg">
      {/* Header */}
      <div className="text-center mb-12">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          How Nova Sentinel Works
        </h3>
        <p className="text-gray-600 text-lg">
          Five Nova models working together in perfect harmony
        </p>
      </div>

      {/* Flow Diagram - Clean and Symmetrical */}
      <div className="relative">
        {/* Horizontal connection line */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 transform -translate-y-1/2 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-30"></div>
        </div>

        {/* Steps - Evenly distributed */}
        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex flex-col items-center">
                {/* Step card */}
                <div className="card-professional bg-white rounded-xl p-6 text-center w-full group hover:scale-105 transition-all z-10 border border-gray-200">
                  {/* Icon with gradient */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} mb-4 shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Model badge */}
                  <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold mb-3">
                    {step.model}
                  </div>

                  {/* Title */}
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {step.title}
                  </h4>

                  {/* Description */}
                  <p className="text-sm text-gray-600">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps - Clean and centered */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-1 transform -translate-y-1/2 z-20">
                    <ArrowRight className="h-6 w-6 text-primary-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center px-6 py-3 bg-primary-50 rounded-lg border border-primary-200">
          <Shield className="h-5 w-5 text-primary-600 mr-2" />
          <span className="text-primary-700 font-semibold">
            Complete Incident Response in Under 1 Minute
          </span>
        </div>
      </div>
    </div>
  );
};

export default NovaFlowDiagram;
