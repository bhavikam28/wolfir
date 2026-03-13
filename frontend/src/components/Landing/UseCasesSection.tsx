/**
 * Use Cases Section — Security incident scenarios wolfir handles
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  IconCryptoMining,
  IconDataExfil,
  IconPrivEsc,
  IconUnauthAccess,
  IconComplianceAudit,
  IconHealthCheck,
  IconSecurityIncidents,
} from '../ui/MinimalIcons';

const useCases = [
  {
    icon: IconCryptoMining,
    title: 'Crypto Mining Detection',
    desc: 'Identify unauthorized compute abuse, anomalous EC2 usage, and coin-mining patterns in CloudTrail.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    icon: IconDataExfil,
    title: 'Data Exfiltration',
    desc: 'Trace S3 downloads, cross-account access, and unusual data transfer patterns.',
    color: 'from-red-500 to-rose-600',
    bg: 'bg-red-50 border-red-200',
  },
  {
    icon: IconPrivEsc,
    title: 'Privilege Escalation',
    desc: 'Detect IAM policy changes, role assumption chains, and unauthorized permission grants.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 border-violet-200',
  },
  {
    icon: IconUnauthAccess,
    title: 'Unauthorized Access',
    desc: 'Flag failed logins, MFA bypass attempts, and credential misuse.',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50 border-indigo-200',
  },
  {
    icon: IconComplianceAudit,
    title: 'Compliance Audits',
    desc: 'Auto-map findings to CIS, NIST, SOC 2, PCI-DSS. Generate audit-ready reports.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    icon: IconHealthCheck,
    title: 'Security Health Check',
    desc: 'Proactive agent queries: IAM audit, CloudTrail anomalies, billing, Security Hub — no incident required.',
    color: 'from-slate-600 to-slate-800',
    bg: 'bg-slate-50 border-slate-200',
  },
];

const UseCasesSection: React.FC = () => {
  return (
    <section className="py-20 bg-white border-y border-slate-200/80" id="use-cases">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <IconSecurityIncidents className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em]">
              Use Cases
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Built for Real Security Incidents
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            From crypto mining to privilege escalation — wolfir's multi-agent pipeline analyzes, classifies, and remediates.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${uc.color} flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{uc.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{uc.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
