/**
 * AI Compliance Teaser — MITRE ATLAS + OWASP LLM Top 10 + NIST AI RMF
 * Broadened from 6 ATLAS technique cards to full 3-framework coverage
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Activity, BookOpen, BarChart3 } from 'lucide-react';

const FRAMEWORKS = [
  {
    icon: Shield,
    name: 'MITRE ATLAS',
    badge: '6 Techniques',
    accentColor: '#6366f1',
    accentBg: 'rgba(99,102,241,0.08)',
    accentBorder: 'rgba(99,102,241,0.2)',
    desc: 'Six AML techniques actively monitored in the wolfir pipeline — not just documented, but checked at runtime.',
    items: [
      'AML.T0051 — Prompt Injection: user input + CloudTrail event data scanned',
      'AML.T0016 — Capability Theft: unauthorized model access detected in real time',
      'AML.T0040 — API Abuse: invocation rate anomaly flagged at 3× baseline',
      'AML.T0024 — Data Exfiltration: Bedrock Guardrail blocks surfaced live',
    ],
  },
  {
    icon: BookOpen,
    name: 'OWASP LLM Top 10',
    badge: '10 Categories',
    accentColor: '#f97316',
    accentBg: 'rgba(249,115,22,0.08)',
    accentBorder: 'rgba(249,115,22,0.2)',
    desc: 'LLM01–LLM10 mapped and monitored. wolfir\'s Strands Agent can query OWASP posture on demand.',
    items: [
      'LLM01 — Prompt Injection: runtime detection + sanitization',
      'LLM06 — Sensitive Info Disclosure: output validation + PII masking via Guardrails',
      'LLM08 — Model Denial of Service: invocation rate monitoring',
      'Compliance posture dashboard — queryable via Agentic Query',
    ],
  },
  {
    icon: BarChart3,
    name: 'NIST AI RMF',
    badge: '4 Functions',
    accentColor: '#0ea5e9',
    accentBg: 'rgba(14,165,233,0.08)',
    accentBorder: 'rgba(14,165,233,0.2)',
    desc: 'GOVERN, MAP, MEASURE, MANAGE — the four core functions of the NIST AI Risk Management Framework, all addressed.',
    items: [
      'GOVERN — policy enforcement via Bedrock Guardrails configuration',
      'MAP — threat surface identification across 6 ATLAS technique areas',
      'MEASURE — real-time invocation monitoring and anomaly scoring',
      'MANAGE — Strands Agent-driven incident response and remediation',
    ],
  },
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
              MITRE ATLAS · OWASP LLM Top 10 · NIST AI RMF
            </span>
          </div>

          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0F172A', lineHeight: 1.15 }}
          >
            wolfir monitors its own AI pipeline
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Full AI compliance coverage across three industry frameworks.{' '}
            <span className="font-semibold text-slate-700">Who protects the AI? We do.</span>
          </p>
        </motion.div>

        {/* 3 framework cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-14">
          {FRAMEWORKS.map((fw, i) => {
            const Icon = fw.icon;
            return (
              <motion.div
                key={fw.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-6 transition-all duration-200 cursor-default flex flex-col"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = `0 8px 24px ${fw.accentBg}, 0 2px 8px rgba(0,0,0,0.04)`;
                  el.style.borderColor = fw.accentBorder;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)';
                  el.style.borderColor = '#E2E8F0';
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: fw.accentBg, border: `1px solid ${fw.accentBorder}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: fw.accentColor }} />
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: fw.accentBg, border: `1px solid ${fw.accentBorder}`, color: fw.accentColor }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {fw.badge}
                  </span>
                </div>

                {/* Framework name */}
                <h3 className="text-base font-bold mb-2" style={{ color: '#0F172A' }}>
                  {fw.name}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748B' }}>
                  {fw.desc}
                </p>

                {/* Coverage items */}
                <ul className="space-y-2 mt-auto">
                  {fw.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: '#475569' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: fw.accentColor }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-10 text-center"
        >
          {[
            { value: '3', label: 'AI Compliance Frameworks' },
            { value: '100%', label: 'Real-time Coverage' },
            { value: '19', label: 'Strands Tools Registered' },
          ].map(s => (
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
