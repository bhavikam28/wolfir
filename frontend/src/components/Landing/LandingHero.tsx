/**
 * Nova Sentinel Hero — Premium white theme
 * Big-tech cloud security aesthetic
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Play, Zap, Cloud } from 'lucide-react';

const LandingHero: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Premium gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full -top-40 -right-40 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full -bottom-32 -left-32 opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 w-full">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            Agentic Incident Response Pipeline
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.08]"
          >
            <span className="block">From Signal to Resolution</span>
            <span className="block mt-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Autonomously
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Built for SOC analysts, cloud security engineers, and incident responders — including teams using AWS IAM Identity Center (SSO). 11,000+ alerts/day, &lt;5% investigated. Nova Sentinel closes the gap.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <a
              href="#console"
              className="btn-nova group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40"
            >
              <Shield className="w-5 h-5" />
              Launch Console
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-base hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-sm"
            >
              <Play className="w-5 h-5 text-indigo-500" />
              Try Demo
            </a>
          </motion.div>

          {/* Two paths — premium cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
          >
            <a
              href="#demo"
              className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-200 hover:bg-violet-50/30 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                  <Play className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-sm font-bold text-slate-900">Demo Scenarios</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Crypto mining, data exfiltration, privilege escalation — explore instantly with no AWS setup
              </p>
            </a>
            <a
              href="#console"
              className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Cloud className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-900">Real AWS Account</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your account — credentials stay local. Analyze live CloudTrail with one click
              </p>
            </a>
          </motion.div>

          {/* Positioning — what makes this different */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-sm text-slate-500 max-w-xl mx-auto"
          >
            Not a SIEM replacement — an AI-native incident response layer showing what agentic workflows look like with Nova.
          </motion.p>

          {/* Powered by bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex flex-wrap justify-center items-center gap-3"
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Model specialization</span>
            {[
              { name: 'Nova Pro', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { name: 'Nova 2 Lite', color: 'bg-violet-50 border-violet-200 text-violet-700' },
              { name: 'Nova Micro', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { name: 'Nova 2 Sonic', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { name: 'Nova Canvas', color: 'bg-pink-50 border-pink-200 text-pink-700' },
            ].map((tech) => (
              <span key={tech.name} className={`px-3 py-1 rounded-full text-[10px] font-bold border ${tech.color}`}>
                {tech.name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
