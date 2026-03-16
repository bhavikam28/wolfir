/**
 * MITRE ATLAS Teaser — AI pipeline self-monitoring, premium light design
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Activity } from 'lucide-react';

const TECHNIQUES = [
  { id: 'AML.T0051', name: 'Prompt Injection',  desc: 'Pattern scanning on all user input and CloudTrail event data before reaching the model.' },
  { id: 'AML.T0016', name: 'Capability Theft',   desc: 'All invocations validated against the approved Amazon Nova model allowlist in real time.' },
  { id: 'AML.T0040', name: 'API Abuse',          desc: 'Invocation rate monitored continuously; anomaly flagged at 3× baseline spike.' },
  { id: 'AML.T0025', name: 'Adversarial Inputs', desc: 'Input validation active across all 5 agent entry points in the pipeline.' },
  { id: 'AML.T0024', name: 'Data Exfiltration',  desc: 'Output validation + Bedrock Guardrail block events surfaced in the ATLAS dashboard.' },
  { id: 'AML.T0044', name: 'Model Poisoning',    desc: 'N/A — no fine-tuning or custom model training in the wolfir pipeline.' },
];

const STATS = [
  { value: '6', label: 'ATLAS Techniques Monitored' },
  { value: '100%', label: 'Real-time Coverage' },
  { value: 'OWASP', label: 'LLM Top 10 Mapped' },
];

const MITREAtlasTeaser: React.FC = () => {
  return (
    <section className="relative overflow-hidden" style={{ background: '#F8FAFC' }}>

      {/* Hard visual break from the dark hero above */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)' }}
      />

      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Soft purple glow top-center */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '800px', height: '400px',
          top: '-100px', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#6366f1' }}>
              MITRE ATLAS · OWASP LLM Top 10
            </span>
          </div>

          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0F172A', lineHeight: 1.15 }}
          >
            wolfir monitors its own AI pipeline
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Six ATLAS techniques monitored in real time.{' '}
            <span className="font-semibold text-slate-700">Who protects the AI? We do.</span>
          </p>
        </motion.div>

        {/* Cards — 3-column, spacious, readable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {TECHNIQUES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl p-6 transition-all duration-200 cursor-default"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 8px 24px rgba(99,102,241,0.10), 0 2px 8px rgba(99,102,241,0.06)';
                el.style.borderColor = 'rgba(99,102,241,0.3)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)';
                el.style.borderColor = '#E2E8F0';
              }}
            >
              {/* Icon row + CLEAN badge */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <Shield className="w-5 h-5" style={{ color: '#6366f1' }} />
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CLEAN
                </span>
              </div>

              {/* Technique ID */}
              <p className="text-xs font-mono font-semibold mb-1.5 tracking-wider" style={{ color: '#94A3B8' }}>
                {t.id}
              </p>

              {/* Name */}
              <h3 className="text-base font-bold mb-2" style={{ color: '#0F172A' }}>
                {t.name}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                {t.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-10 text-center"
        >
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-2xl font-extrabold" style={{ color: '#6366f1' }}>{s.value}</span>
              <span className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">{s.label}</span>
            </div>
          ))}
        </motion.div>

      </div>

      {/* Bottom separator */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }}
      />
    </section>
  );
};

export default MITREAtlasTeaser;
