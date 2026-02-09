/**
 * Nova Flow Diagram - Pipeline with themed background
 * Clean, professional horizontal flow with clearly visible step numbers
 * Inspired by Wiz.io, CrowdStrike, Orca enterprise design
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Brain, Zap, Shield, FileText, ChevronRight } from 'lucide-react';

interface PipelineStep {
  id: string;
  icon: any;
  title: string;
  model: string;
  description: string;
  detail: string;
  color: string;
  bg: string;
  badgeClass: string;
}

const STEPS: PipelineStep[] = [
  {
    id: 'detect', icon: Eye, title: 'Detect', model: 'Nova Pro',
    description: 'Visual & architecture analysis',
    detail: 'Analyzes uploaded architecture diagrams, screenshots, and CloudTrail events to identify security misconfigurations, open ports, and policy violations.',
    color: '#3B82F6', bg: '#EFF6FF',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'investigate', icon: Brain, title: 'Investigate', model: 'Nova 2 Lite',
    description: 'Timeline & root cause',
    detail: 'Builds comprehensive attack timelines from up to 90 days of CloudTrail logs. Traces kill chains back to the initial compromise vector.',
    color: '#8B5CF6', bg: '#F5F3FF',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'classify', icon: Zap, title: 'Classify', model: 'Nova Micro',
    description: 'Risk scoring in <1s',
    detail: 'Ultra-fast classification of every security event with confidence scores, severity ratings, and MITRE ATT&CK mapping in under 1 second.',
    color: '#F59E0B', bg: '#FFFBEB',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'remediate', icon: Shield, title: 'Remediate', model: 'Orchestrator',
    description: 'Auto-fix with approval gates',
    detail: 'Generates targeted remediation plans with step-by-step IAM policy fixes, security group corrections, and compliance alignment.',
    color: '#10B981', bg: '#ECFDF5',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'document', icon: FileText, title: 'Document', model: 'Nova 2 Lite',
    description: 'JIRA, Slack & Confluence',
    detail: 'Automatically generates incident tickets, Slack summaries, and Confluence post-mortem documentation ready for your team.',
    color: '#A855F7', bg: '#FAF5FF',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
];

const NovaFlowDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const hoveredStep = STEPS.find(s => s.id === activeStep);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 border border-indigo-100/60 shadow-card">
      {/* Subtle dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, #c7d2fe 0.6px, transparent 0.6px)',
        backgroundSize: '24px 24px',
        opacity: 0.4,
      }} />

      <div className="relative z-10 p-8 lg:p-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">How Nova Sentinel Works</h3>
          <p className="text-sm text-slate-500">
            5 specialized AI models — one autonomous pipeline — under 60 seconds
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="relative flex items-stretch justify-between gap-2 lg:gap-3">
          {/* Horizontal connection line */}
          <div className="absolute top-[48px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-200 via-purple-200 via-amber-200 via-emerald-200 to-violet-200 z-0 hidden lg:block" />

          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;

            return (
              <React.Fragment key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative z-10 flex-1 min-w-0"
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  <div className={`bg-white/90 backdrop-blur-sm rounded-xl p-5 border text-center transition-all duration-300 h-full flex flex-col items-center group cursor-pointer ${
                    isActive ? 'border-slate-300 shadow-md -translate-y-1' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                    {/* Step number - clearly visible */}
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                      style={{ backgroundColor: step.color }}
                    >
                      {index + 1}
                    </div>

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: step.bg }}
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.8} style={{ color: step.color }} />
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h4>

                    {/* Model badge */}
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${step.badgeClass}`}>
                      {step.model}
                    </span>

                    {/* Description */}
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>

                {/* Arrow between steps */}
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center z-20 -mx-1">
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </motion.div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Detail panel on hover */}
        <AnimatePresence>
          {hoveredStep && (
            <motion.div
              key={hoveredStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="mt-6 mx-auto max-w-2xl"
            >
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: hoveredStep.bg }}>
                    <hoveredStep.icon className="w-4 h-4" style={{ color: hoveredStep.color }} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-slate-900 font-bold text-sm">{hoveredStep.title}</span>
                    <span className="text-slate-400 text-xs ml-2">powered by {hoveredStep.model}</span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{hoveredStep.detail}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom badge */}
        {!hoveredStep && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 rounded-full border border-emerald-200">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Complete Incident Response in Under 60 Seconds
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NovaFlowDiagram;
