/**
 * SOC Problems — Premium dark section, 5 problems → The Result
 */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, DollarSign, TrendingDown, XCircle, ArrowDown } from 'lucide-react';

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Alert Fatigue',
    desc: '960+ alerts/day — far beyond triage capacity for any human team.',
    accent: '#F87171',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  {
    icon: Search,
    title: 'Missed Detections',
    desc: '40% of alerts go uninvestigated. You throttle to match capacity.',
    accent: '#FB923C',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
  },
  {
    icon: DollarSign,
    title: 'Soaring Cost',
    desc: '15 min–2 hrs per alert. $4.44M average cost of a single breach.',
    accent: '#FBBF24',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    icon: TrendingDown,
    title: 'Analyst Burnout',
    desc: 'Repetitive, manual triage drives turnover and drops coverage.',
    accent: '#A78BFA',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    icon: XCircle,
    title: 'Failed Automation',
    desc: 'SOAR tools are too brittle and expensive to maintain at scale.',
    accent: '#60A5FA',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.2)',
  },
];

const SOCProblemsSection: React.FC = () => {
  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #080D1F 0%, #0A1224 100%)' }}
    >
      {/* Alert flood visualization */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url(/images/alert-flood.png)', opacity: 0.13 }}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(8,13,31,0.55) 0%, rgba(10,18,36,0.65) 100%)' }} />
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.4), transparent)' }} />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.4), transparent)' }} />

      {/* Top / Bottom edge lines */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.2), transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.2), transparent)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="eyebrow-dark mb-4">The Problem</p>
          <h2
            className="font-extrabold text-white tracking-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
          >
            Triaging Security Alerts Is{' '}
            <span style={{
              background: 'linear-gradient(135deg, #F87171, #FB923C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Broken</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Meanwhile, attackers are rapidly weaponizing AI and outpacing every human defense.
          </p>
        </motion.div>

        {/* 5 problem cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 group"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${p.border}` }}
                >
                  <Icon className="w-6 h-6" style={{ color: p.accent }} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>

                {/* Connector line on desktop */}
                {i < PROBLEMS.length - 1 && (
                  <div
                    className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-px opacity-30"
                    style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.4), transparent)' }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Converge arrow + result */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center"
        >
          <div className="w-px h-10 mb-6" style={{ background: 'linear-gradient(to bottom, rgba(96,165,250,0.4), rgba(96,165,250,0.05))' }} />

          <div
            className="px-5 py-2 rounded-full mb-6"
            style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">The Result</span>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl font-bold text-white text-center max-w-2xl leading-snug"
          >
            Critical alerts are missed or investigated{' '}
            <span className="text-red-400">too late</span>, increasing breach risk.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8 px-8 py-4 rounded-2xl flex items-center gap-3"
            style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
          >
            <ArrowDown className="w-5 h-5 text-blue-400 rotate-180" />
            <p className="text-blue-300 font-semibold text-sm">
              wolfir closes the gap — 7 Nova capabilities · MITRE ATLAS · autonomous response
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SOCProblemsSection;
