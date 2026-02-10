/**
 * Nova Sentinel Hero - Clean, light, professional
 * Subtle gradient bg with bold typography. Diagram is in a separate section below.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Clock, Brain, Sparkles, ChevronDown } from 'lucide-react';

const LandingHero: React.FC = () => {
  const stats = [
    { value: '<60s', label: 'Incident Resolution', icon: Clock },
    { value: '5', label: 'Nova AI Models', icon: Brain },
    { value: '100%', label: 'Autonomous', icon: Zap },
  ];

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 25%, #f0f4ff 50%, #faf5ff 75%, #fdf2f8 100%)'
      }} />
      
      {/* Very subtle grid */}
      <div className="absolute inset-0 hero-grid opacity-60" />
      
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            top: '-10%', right: '-5%'
          }}
          animate={{ x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
            bottom: '0%', left: '-5%'
          }}
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-indigo-100 shadow-sm mb-10"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-600">
              Amazon Nova AI Hackathon 2026
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-[1.05]"
          >
            <span className="block">Security Incidents</span>
            <span className="block mt-1 gradient-text">Resolved in Seconds</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Nova Sentinel autonomously detects, investigates, and remediates cloud security threats
            using <span className="text-slate-900 font-semibold">5 Amazon Nova AI models</span> working
            in perfect orchestration.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <a
              href="#console"
              className="btn-nova group px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base flex items-center gap-3 justify-center shadow-glow-sm"
            >
              <Shield className="w-5 h-5" />
              Launch Console
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#demo"
              className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-base hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-3 justify-center"
            >
              <Zap className="w-5 h-5 text-indigo-600" />
              Try Demo
            </a>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center gap-12 sm:gap-16 mb-12"
          >
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 mb-3">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 metric-value">{stat.value}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex justify-center"
          >
            <ChevronDown className="w-5 h-5 text-slate-300" />
          </motion.div>
        </div>
      </div>

      {/* Powered by bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap justify-center items-center gap-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-3">Powered by</span>
            {[
              { name: 'Nova Pro', color: 'text-blue-600 bg-blue-50 border-blue-100' },
              { name: 'Nova 2 Lite', color: 'text-purple-600 bg-purple-50 border-purple-100' },
              { name: 'Nova Micro', color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { name: 'Nova 2 Sonic', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { name: 'Nova Act', color: 'text-rose-600 bg-rose-50 border-rose-100' },
            ].map((tech) => (
              <span key={tech.name} className={`px-3 py-1 rounded-full text-[11px] font-bold border ${tech.color}`}>
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
