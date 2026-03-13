/**
 * Nova Models Section — 7 Amazon Nova capabilities with Model ID and Usage
 * Makes it clear what/why/which model we use for what
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Brain, Zap, Mic, Image, MousePointer, Sparkles } from 'lucide-react';

const NOVA_MODELS = [
  { num: 1, name: 'Nova Pro', modelId: 'amazon.nova-pro-v1:0', usage: 'Visual architecture analysis', icon: Eye, color: 'blue' },
  { num: 2, name: 'Nova 2 Lite', modelId: 'us.amazon.nova-2-lite-v1:0', usage: 'Timeline, remediation, docs, Aria, Strands Agent', icon: Brain, color: 'violet' },
  { num: 3, name: 'Nova Micro', modelId: 'amazon.nova-micro-v1:0', usage: 'Risk scoring', icon: Zap, color: 'amber' },
  { num: 4, name: 'Nova 2 Sonic', modelId: 'amazon.nova-2-sonic-v1:0', usage: 'Voice (integration-ready)', icon: Mic, color: 'emerald' },
  { num: 5, name: 'Nova Canvas', modelId: 'amazon.nova-canvas-v1:0', usage: 'Report cover art', icon: Image, color: 'pink' },
  { num: 6, name: 'Nova Act', modelId: 'nova-act SDK', usage: 'Browser automation plans', icon: MousePointer, color: 'rose' },
  { num: 7, name: 'Nova Multimodal Embeddings', modelId: 'amazon.nova-2-multimodal-embeddings-v1:0', usage: 'Incident similarity', icon: Sparkles, color: 'indigo' },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
};

const NovaModelsSection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50/80 border-y border-slate-200/80" id="nova-models">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
            Nova Model Selection
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            What, Why, Which Model — and Why
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            wolfir uses 7 Amazon Nova capabilities. Each is chosen for what it does best — not one model for everything.
          </p>
        </motion.div>

        {/* Desktop: Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">#</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model / Service</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model ID</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usage</th>
              </tr>
            </thead>
            <tbody>
              {NOVA_MODELS.map((m) => {
                const Icon = m.icon;
                const c = colorClasses[m.color];
                return (
                  <tr key={m.num} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-500">{m.num}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${c.bg} ${c.border} ${c.text} font-semibold`}>
                        <Icon className="w-3.5 h-3.5" />
                        {m.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{m.modelId}</td>
                    <td className="px-5 py-4 text-slate-700">{m.usage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-4">
          {NOVA_MODELS.map((m, i) => {
            const Icon = m.icon;
            const c = colorClasses[m.color];
            return (
              <motion.div
                key={m.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono text-sm text-slate-600">{m.num}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${c.bg} ${c.border} ${c.text} text-xs font-semibold mb-2`}>
                      <Icon className="w-3 h-3" />
                      {m.name}
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 mb-1 break-all">{m.modelId}</p>
                    <p className="text-sm text-slate-700">{m.usage}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-sm text-slate-500 max-w-xl mx-auto"
        >
          Nova Micro scores risk in &lt;1s. Nova 2 Lite handles heavy reasoning. Nova Pro reads images. Nova Canvas generates visuals. Nova Act automates browser workflows. Embeddings power semantic search. One model for everything would be slower and less accurate.
        </motion.p>
      </div>
    </section>
  );
};

export default NovaModelsSection;
