/**
 * MITRE ATLAS Teaser — First thing judges see after hero
 * "Something that couldn't exist before Nova" — lead with it harder
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2 } from 'lucide-react';

const TECHNIQUES = [
  { id: 'AML.T0051', name: 'Prompt Injection', status: 'CLEAN' },
  { id: 'AML.T0016', name: 'Capability Theft', status: 'CLEAN' },
  { id: 'AML.T0040', name: 'API Abuse', status: 'CLEAN' },
  { id: 'AML.T0024', name: 'Data Exfiltration', status: 'CLEAN' },
];

const MITREAtlasTeaser: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-emerald-50/80 to-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Something that couldn&apos;t exist before Nova
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            wolfir monitors its own AI pipeline
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            MITRE ATLAS + OWASP LLM Top 10. Six techniques monitored in real time — prompt injection, capability theft, API abuse, adversarial inputs, data exfiltration. Who protects the AI? We do.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3"
        >
          {TECHNIQUES.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-mono text-slate-500">{t.id}</span>
              <span className="text-sm font-semibold text-slate-700">{t.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{t.status}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MITREAtlasTeaser;
