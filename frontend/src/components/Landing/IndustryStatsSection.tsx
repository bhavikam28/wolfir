/**
 * Industry Stats — Premium white section, sourced proof numbers
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const STATS = [
  {
    value: '960+',
    unit: '',
    label: 'Security alerts per day in the average SOC',
    sub: '40% go uninvestigated due to volume',
    source: 'Prophet Security, AI in SOC Survey, 2025',
    sourceUrl: 'https://www.prophetsecurity.ai/blog/6-key-takeaways-from-the-ai-in-soc-survey-report',
    accentColor: '#2563EB',
    bgColor: 'rgba(37,99,235,0.04)',
    borderColor: 'rgba(37,99,235,0.12)',
  },
  {
    value: '$4.44',
    unit: 'M',
    label: 'Average cost of a data breach worldwide',
    sub: 'U.S. organisations averaged $10.2M — a record high',
    source: 'IBM Cost of a Data Breach (Ponemon), 2025',
    sourceUrl: 'https://www.ibm.com/reports/data-breach',
    accentColor: '#DC2626',
    bgColor: 'rgba(220,38,38,0.04)',
    borderColor: 'rgba(220,38,38,0.12)',
  },
  {
    value: '97',
    unit: '%',
    label: 'Of AI-related breach victims lacked AI access controls',
    sub: 'Ungoverned AI is a growing attack surface',
    source: 'IBM Cost of a Data Breach, 2025',
    sourceUrl: 'https://www.ibm.com/reports/data-breach',
    accentColor: '#7C3AED',
    bgColor: 'rgba(124,58,237,0.04)',
    borderColor: 'rgba(124,58,237,0.12)',
  },
  {
    value: '$1.9',
    unit: 'M',
    label: 'Saved by organisations using AI-extensive security',
    sub: 'vs. those who don\'t use AI in their security stack',
    source: 'IBM Cost of a Data Breach, 2025',
    sourceUrl: 'https://www.ibm.com/reports/data-breach',
    accentColor: '#059669',
    bgColor: 'rgba(5,150,105,0.04)',
    borderColor: 'rgba(5,150,105,0.12)',
  },
];

const IndustryStatsSection: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-3">Industry Intelligence</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            The Cloud + AI Security Gap
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            Why autonomous incident response and AI governance have never been more critical.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-8 transition-all duration-300 group hover:-translate-y-1"
              style={{
                background: s.bgColor,
                border: `1px solid ${s.borderColor}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px -12px ${s.accentColor}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <span
                    className="font-extrabold leading-none tracking-tight font-mono"
                    style={{
                      fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
                      color: s.accentColor,
                    }}
                  >
                    {s.value}
                    <span style={{ fontSize: '60%', marginLeft: '2px' }}>{s.unit}</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-base font-bold text-slate-900 leading-snug mb-1.5">
                    {s.label}
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">
                    {s.sub}
                  </p>
                  {s.sourceUrl ? (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {s.source}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">{s.source}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)', color: '#2563EB' }}
          >
            wolfir closes the gap — 7 Nova capabilities · MITRE ATLAS · AI pipeline monitoring · one-click remediation
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default IndustryStatsSection;
