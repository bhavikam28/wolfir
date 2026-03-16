/**
 * Pricing Section — Transparent, pay-only-for-Bedrock
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, DollarSign } from 'lucide-react';

const PricingSection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white border-y border-slate-200/80" id="pricing">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
            Pricing
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Pay Only for What You Use
          </h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            No subscription. No platform fees. You pay only for your own AWS Bedrock usage.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-white border-2 border-indigo-200 shadow-xl overflow-hidden"
        >
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Bedrock Usage Only</h3>
                <p className="text-sm text-slate-500">~$0.01–0.10 per incident</p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              {[
                'Demo mode — free, no AWS required',
                '7 Nova capabilities orchestrated per analysis',
                'Credentials stay local — never stored',
                'Open source — audit the code',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <DollarSign className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-600">
                <strong>Typical cost:</strong> 50–100 CloudTrail events ≈ $0.02–0.05. Full pipeline (timeline, attack path, remediation, docs) in one run.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
