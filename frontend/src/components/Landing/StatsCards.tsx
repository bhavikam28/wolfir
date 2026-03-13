/**
 * Project-relevant stats — defensible numbers
 * 11k alerts: Ponemon/Cost of Data Breach; 5 Nova: product; 23 tools: MCP count; 90d: CloudTrail max
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Cpu, Shield, FileText } from 'lucide-react';

const STATS = [
  {
    value: '11K+',
    suffix: '',
    label: 'Alerts per day (avg SOC)',
    sub: 'Ponemon Institute — most go uninvestigated',
    icon: Zap,
  },
  {
    value: '5',
    suffix: '',
    label: 'Nova models orchestrated',
    sub: 'Pro, 2 Lite, Micro, 2 Sonic, Canvas',
    icon: Cpu,
  },
  {
    value: '23',
    suffix: '',
    label: 'MCP tools across 6 servers',
    sub: 'CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security',
    icon: Shield,
  },
  {
    value: '90',
    suffix: 'd',
    label: 'CloudTrail lookback',
    sub: 'Kill chain tracing, campaign correlation',
    icon: FileText,
  },
];

const StatsCards: React.FC = () => {
  return (
    <section className="py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-2">
            By the numbers
          </p>
          <h2 className="text-xl font-bold text-slate-900">Cloud + AI security in one platform</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all text-left"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-indigo-600 font-mono">
                      {stat.value}
                      <span className="text-lg">{stat.suffix}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{stat.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsCards;
