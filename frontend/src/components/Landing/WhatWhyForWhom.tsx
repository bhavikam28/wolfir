/**
 * What / Why / For Whom — Crystal-clear messaging
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Users } from 'lucide-react';

const WhatWhyForWhom: React.FC = () => {
  const items = [
    {
      icon: Target,
      label: 'What',
      title: 'Agentic Incident Response Pipeline',
      desc: 'Context-aware orchestration — 5 Nova models, each doing what it\'s best at. From signal to remediation plan to documentation in one autonomous pipeline.',
    },
    {
      icon: Zap,
      label: 'Why',
      title: 'Closes the Detection–Response Gap',
      desc: 'Existing tools detect. They don\'t respond. wolfir closes the gap — agents share state across the pipeline, no manual triage, human-in-the-loop approval for risky actions.',
    },
    {
      icon: Users,
      label: 'For Whom',
      title: 'SOC Analysts, Cloud Security Engineers, Incident Responders',
      desc: 'Built for security teams drowning in alerts — including those using AWS IAM Identity Center (SSO). SOC analysts, cloud security engineers, and incident responders. Also for anyone exploring agentic AI in high-stakes operational workflows.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/80 border-y border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
            What It Does · Why It Matters · Who It&apos;s For
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Agentic AI for high-stakes operational workflows.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-indigo-200/60 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-indigo-600" strokeWidth={1.8} />
                </div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {item.label}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhatWhyForWhom;
