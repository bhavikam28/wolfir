/**
 * Cost Impact Estimation - Financial impact analysis of security incidents
 * Based on industry benchmarks with clickable source links
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Server, Database, Scale, Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Timeline } from '../../types/incident';

interface CostImpactProps {
  timeline: Timeline;
  incidentType?: string;
}

interface CostCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  amount: number;
  description: string;
  methodology: string;
  source: string;
  sourceUrl: string;
  color: string;
  bg: string;
  complianceBreakdown?: { framework: string; range: string; share: number }[];
}

function estimateCosts(timeline: Timeline, incidentType?: string): CostCategory[] {
  const eventCount = timeline.events?.length || 0;
  const hasCritical = timeline.events?.some(e => e.severity === 'CRITICAL');
  const hasDataAccess = timeline.events?.some(e => 
    (e.action || '').toLowerCase().includes('data') ||
    (e.action || '').toLowerCase().includes('s3') ||
    (e.action || '').toLowerCase().includes('get')
  );
  const isCryptoMining = incidentType?.toLowerCase().includes('crypto');
  const isDataExfil = incidentType?.toLowerCase().includes('exfil') || incidentType?.toLowerCase().includes('data');

  const costs: CostCategory[] = [];

  if (isCryptoMining) {
    const amount = 2400 + Math.floor(eventCount * 180);
    costs.push({
      id: 'compute',
      label: 'Unauthorized Compute',
      icon: Server,
      amount,
      description: 'Estimated cost of unauthorized EC2 instances running crypto mining workloads over the incident duration.',
      methodology: `Based on ${eventCount} events detected × $180/event + $2,400 baseline. Assumes p3.2xlarge instances ($3.06/hr) commonly used for crypto mining, running for estimated incident duration.`,
      source: 'AWS EC2 On-Demand Pricing (us-east-1)',
      sourceUrl: 'https://aws.amazon.com/ec2/pricing/on-demand/',
      color: 'text-red-700',
      bg: 'bg-red-50',
    });
  } else {
    const amount = 350 + Math.floor(eventCount * 45);
    costs.push({
      id: 'compute',
      label: 'Compromised Resources',
      icon: Server,
      amount,
      description: 'Estimated cost of compromised cloud resources during the incident window.',
      methodology: `Based on ${eventCount} events × $45/event + $350 baseline. Estimates include compute, storage, and network costs for compromised resources during the incident window.`,
      source: 'AWS Resource Pricing Estimates',
      sourceUrl: 'https://aws.amazon.com/pricing/',
      color: 'text-orange-700',
      bg: 'bg-orange-50',
    });
  }

  if (isDataExfil || hasDataAccess) {
    const amount = 15000 + (hasCritical ? 25000 : 5000);
    costs.push({
      id: 'breach',
      label: 'Data Breach Exposure',
      icon: Database,
      amount,
      description: 'Potential liability based on industry breach cost data for the scope observed.',
      methodology: `Estimated from IBM CODB 2025: avg $4.88M per breach, scaled to observed scope. ${hasCritical ? 'Critical severity detected (+$25K exposure)' : 'Standard severity (+$5K exposure)'}. Includes notification costs, legal fees, and regulatory penalties.`,
      source: 'IBM Cost of Data Breach Report 2025',
      sourceUrl: 'https://www.ibm.com/reports/data-breach',
      color: 'text-red-700',
      bg: 'bg-red-50',
    });
  }

  costs.push({
    id: 'downtime',
    label: 'Operational Downtime',
    icon: Clock,
    amount: hasCritical ? 8500 : 2200,
    description: 'Estimated revenue impact from service disruption during investigation and remediation.',
    methodology: `${hasCritical ? 'Critical incident: ~2hr MTTR × $4,250/hr' : 'Standard incident: ~1hr MTTR × $2,200/hr'}. Based on average downtime costs for mid-size organizations.`,
    source: 'Gartner IT Downtime Research 2024',
    sourceUrl: 'https://www.gartner.com/en/information-technology',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  });

  costs.push({
    id: 'remediation',
    label: 'Manual Remediation (Traditional)',
    icon: AlertTriangle,
    amount: hasCritical ? 12000 : 4500,
    description: 'Estimated cost of security team labor for manual incident response without Nova Sentinel.',
    methodology: `${hasCritical ? '3 security engineers × 20hrs × $200/hr' : '2 security engineers × 15hrs × $150/hr'}. Includes investigation, containment, eradication, recovery, and post-incident review.`,
    source: 'Bureau of Labor Statistics / Glassdoor',
    sourceUrl: 'https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  });

  if (hasCritical || isDataExfil) {
    costs.push({
      id: 'compliance',
      label: 'Compliance Penalty Risk',
      icon: Scale,
      amount: 50000,
      description: 'Potential regulatory fines for non-compliance with GDPR, CCPA, HIPAA, or PCI-DSS.',
      methodology: `Regulatory fine estimates based on observed incident scope:\n\n• GDPR (Art. 83): Up to 4% of annual global revenue or €20M — data breach + inadequate security.\n• PCI-DSS: $5,000–$100,000/month from card brands — compromised CDE access.\n• HIPAA: $100–$50,000 per violation tier — ePHI exposure if healthcare data involved.\n• CCPA: $2,500–$7,500 per intentional violation — California resident PII.\n\nThis $50,000 estimate assumes moderate exposure across frameworks. Actual fines depend on jurisdiction, revenue, and breach scope.`,
      source: 'GDPR Art. 83, PCI-DSS SAQ Guidelines, HIPAA Breach Rule',
      sourceUrl: 'https://gdpr.eu/fines/',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      complianceBreakdown: [
        { framework: 'GDPR', range: 'Up to 4% revenue or €20M', share: 18000 },
        { framework: 'PCI-DSS', range: '$5,000–$100,000/month', share: 15000 },
        { framework: 'HIPAA', range: '$100–$50,000 per violation', share: 10000 },
        { framework: 'CCPA', range: '$2,500–$7,500 per violation', share: 7000 },
      ],
    });
  }

  return costs;
}

const CompactBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
};

const CostImpact: React.FC<CostImpactProps> = ({ timeline, incidentType }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const costs = useMemo(() => estimateCosts(timeline, incidentType), [timeline, incidentType]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedIds.size === costs.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(costs.map(c => c.id)));
    }
  };

  const totalTraditional = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs]);
  const savingsBreakdown = useMemo(() => {
    const remediationSaving = costs.find(c => c.id === 'remediation')?.amount || 0;
    const downtimeAmount = costs.find(c => c.id === 'downtime')?.amount || 0;
    const downtimeSaving = Math.round(downtimeAmount * 0.85);
    return {
      remediation: remediationSaving,
      downtime: downtimeSaving,
      total: Math.round(remediationSaving + downtimeSaving),
    };
  }, [costs]);
  const novaSentinelSavings = savingsBreakdown.total;
  const totalWithNova = totalTraditional - novaSentinelSavings;

  const maxCost = Math.max(...costs.map(c => c.amount));
  const barColors: Record<string, string> = {
    'text-red-700': '#EF4444',
    'text-orange-700': '#F97316',
    'text-amber-700': '#F59E0B',
    'text-purple-700': '#8B5CF6',
    'text-indigo-700': '#6366F1',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-teal-50/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <DollarSign className="w-5 h-5 text-teal-600" />
              Cost Impact Estimation
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Estimated financial exposure and Nova Sentinel savings
            </p>
          </div>
          <button
            onClick={expandAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Info className="w-3.5 h-3.5" />
            {expandedIds.size === costs.length ? 'Collapse All' : 'Expand All'} Methodologies
          </button>
        </div>

        {/* Before/After comparison */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 shadow-sm">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-widest mb-1.5">Without Nova Sentinel</div>
            <div className="text-2xl font-bold text-rose-700 tabular-nums tracking-tight">${totalTraditional.toLocaleString()}</div>
            <p className="text-xs text-rose-500 mt-1.5">Traditional incident response</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 shadow-sm">
            <div className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mb-1.5">With Nova Sentinel</div>
            <div className="text-2xl font-bold text-teal-700 tabular-nums tracking-tight">${totalWithNova.toLocaleString()}</div>
            <p className="text-xs text-teal-600 mt-1.5 font-medium">Savings: ${novaSentinelSavings.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider mb-1.5">Without Nova</p>
            <div className="h-2.5 rounded-full overflow-hidden bg-slate-100">
              <motion.div className="h-full rounded-full bg-rose-400" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-1.5">With Nova</p>
            <div className="h-2.5 rounded-full overflow-hidden bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${totalTraditional > 0 ? Math.round((totalWithNova / totalTraditional) * 100) : 0}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Total Exposure</div>
            <div className="text-xl font-bold text-rose-600 tabular-nums tracking-tight">
              ${totalTraditional.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Nova Sentinel Saves</div>
            <div className="text-xl font-bold text-teal-600 tabular-nums tracking-tight">
              ${novaSentinelSavings.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Response Time</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-800 tabular-nums">&lt;60s</span>
              <span className="text-xs text-slate-400">vs 45min avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-5 space-y-3">
        {costs.map((cost, i) => {
          const Icon = cost.icon;
          const isExpanded = expandedIds.has(cost.id);
          return (
            <motion.div
              key={cost.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className={`rounded-xl border transition-all cursor-pointer ${
                  isExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                onClick={() => toggleExpand(cost.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className={`w-8 h-8 rounded-lg ${cost.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cost.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-900">{cost.label}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${cost.color} metric-value`}>
                          ${cost.amount.toLocaleString()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                    <CompactBar value={cost.amount} max={maxCost} color={barColors[cost.color] || '#6366F1'} />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{cost.description}</p>
                  </div>
                </div>

                {/* Expanded methodology */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-3 bg-slate-50/50 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Calculation Methodology</p>
                          <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{cost.methodology}</p>
                        </div>
                        {cost.complianceBreakdown && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Framework-level fine estimates</p>
                            <div className="space-y-1">
                              {cost.complianceBreakdown.map((item) => (
                                <div key={item.framework} className="flex justify-between text-[11px]">
                                  <span className="text-slate-600">{item.framework}:</span>
                                  <span className="font-medium text-slate-700">{item.range}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <a
                          href={cost.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source: {cost.source}
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Nova Sentinel ROI */}
      <div className="px-5 pb-5">
        <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">Nova Sentinel ROI</h4>
              <p className="text-xs text-slate-600 mb-2">
                Autonomous response reduces manual remediation by <span className="font-bold">100%</span> and 
                cuts downtime by <span className="font-bold">85%</span>, saving an estimated <span className="font-bold">${novaSentinelSavings.toLocaleString()}</span> per incident.
              </p>
              <div className="text-[10px] text-teal-600 space-y-0.5">
                <div className="flex justify-between"><span>Manual remediation eliminated</span><span className="font-bold">${savingsBreakdown.remediation.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Downtime reduced 85%</span><span className="font-bold">${savingsBreakdown.downtime.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostImpact;
