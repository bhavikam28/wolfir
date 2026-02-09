/**
 * Professional Features Section - Modern SaaS Design with Gradients
 */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Brain, Zap, Mic, FileText, Shield, 
  Clock, Target, Database, Network, Lock, GitBranch 
} from 'lucide-react';
import NovaFlowDiagram from '../Visualizations/NovaFlowDiagram';

interface Feature {
  icon: any;
  title: string;
  description: string;
  badge?: string;
  gradientFrom: string;
  gradientTo: string;
  badgeColor: string;
  badgeBg: string;
}

const features: Feature[] = [
  {
    icon: Eye,
    title: 'Multimodal Visual Analysis',
    description: 'Analyze architecture diagrams and screenshots to detect configuration drift and security gaps in real-time.',
    badge: 'Nova Pro',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
    badgeColor: 'text-blue-700',
    badgeBg: 'bg-blue-50',
  },
  {
    icon: Clock,
    title: 'Temporal Intelligence',
    description: 'Build comprehensive attack timelines from 90 days of CloudTrail logs with automated root cause identification.',
    badge: 'Nova 2 Lite',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
    badgeColor: 'text-purple-700',
    badgeBg: 'bg-purple-50',
  },
  {
    icon: Zap,
    title: 'Real-Time Risk Scoring',
    description: 'Classify security configurations in under 1 second with AI-powered confidence scoring and actionable insights.',
    badge: 'Nova Micro',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-600',
    badgeColor: 'text-amber-700',
    badgeBg: 'bg-amber-50',
  },
  {
    icon: Mic,
    title: 'Voice-Powered Investigation',
    description: 'Hands-free incident investigation with natural language commands and instant voice responses.',
    badge: 'Nova 2 Sonic',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    badgeColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
  },
  {
    icon: FileText,
    title: 'Intelligent Documentation',
    description: 'Automated JIRA tickets, Slack notifications, and Confluence post-mortems with complete context. (Nova 2 Lite for content generation)',
    badge: 'Nova 2 Lite',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-purple-600',
    badgeColor: 'text-violet-700',
    badgeBg: 'bg-violet-50',
  },
  {
    icon: Shield,
    title: 'Autonomous Remediation',
    description: 'Generate and execute remediation plans validated against AWS best practices with approval gates.',
    badge: 'Automated',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-red-600',
    badgeColor: 'text-rose-700',
    badgeBg: 'bg-rose-50',
  },
  {
    icon: Database,
    title: 'Knowledge-Augmented AI',
    description: 'RAG-powered access to CIS Benchmarks, NIST 800-53, and AWS Security Best Practices.',
    badge: 'RAG Enabled',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-blue-600',
    badgeColor: 'text-cyan-700',
    badgeBg: 'bg-cyan-50',
  },
  {
    icon: Lock,
    title: 'Safety Guardrails',
    description: 'Ensure compliance with security policies, prevent destructive operations, and detect sensitive data.',
    badge: 'Compliant',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-blue-600',
    badgeColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-50',
  },
  {
    icon: Network,
    title: 'Multi-Agent Orchestration',
    description: 'Coordinate multiple specialized agents with state management and automatic error recovery.',
    badge: 'Agentic AI',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-cyan-600',
    badgeColor: 'text-sky-700',
    badgeBg: 'bg-sky-50',
  },
  {
    icon: Target,
    title: 'Drift Detection',
    description: 'Compare intended architecture against actual AWS state to identify configuration drift automatically.',
    badge: 'Visual AI',
    gradientFrom: 'from-fuchsia-500',
    gradientTo: 'to-pink-600',
    badgeColor: 'text-fuchsia-700',
    badgeBg: 'bg-fuchsia-50',
  },
  {
    icon: GitBranch,
    title: 'Attack Pattern Recognition',
    description: 'Identify privilege escalation, lateral movement, data exfiltration, and persistence mechanisms.',
    badge: 'Intelligent',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-amber-600',
    badgeColor: 'text-orange-700',
    badgeBg: 'bg-orange-50',
  },
  {
    icon: Brain,
    title: 'Root Cause Analysis',
    description: 'Trace incidents back to their origin across complex multi-step attack chains with deep reasoning.',
    badge: 'Advanced',
    gradientFrom: 'from-slate-500',
    gradientTo: 'to-gray-600',
    badgeColor: 'text-slate-700',
    badgeBg: 'bg-slate-50',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section className="py-20 bg-slate-50" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Complete Security Automation
          </h2>
          <p className="text-xl text-slate-600">
            Five Nova models working together in perfect harmony
          </p>
        </div>

        {/* Nova Flow Diagram */}
        <div className="mb-20">
          <NovaFlowDiagram />
        </div>

        {/* Features Grid with Gradients */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradientFrom} ${feature.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity`}
                />
                
                <div className="relative">
                  {/* Icon with gradient background */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradientFrom} ${feature.gradientTo} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Badge */}
                  <div className={`inline-block px-3 py-1 ${feature.badgeBg} ${feature.badgeColor} text-xs font-semibold rounded-full mb-3`}>
                    {feature.badge}
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
