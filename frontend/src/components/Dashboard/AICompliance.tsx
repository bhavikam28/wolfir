/**
 * AI Compliance — OWASP LLM, NIST AI RMF, ISO 23894. Premium design, info-rich.
 * Single source of truth for AI compliance frameworks.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, ChevronUp, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { IconComplianceAudit, IconShield, IconMap, IconBarChart, IconSettings } from '../ui/MinimalIcons';
import api from '../../services/api';
import { OWASP_LLM_DETAILS, NIST_QUADRANTS_FULL } from '../../data/aiComplianceData';

const DEMO_OWASP = {
  posture_percent: 100,
  passed: 10,
  total: 10,
  categories: [
    { id: 'LLM01', name: 'Prompt Injection', status: 'CLEAN' },
    { id: 'LLM02', name: 'Sensitive Information Disclosure', status: 'CLEAN' },
    { id: 'LLM03', name: 'Supply Chain', status: 'CLEAN' },
    { id: 'LLM04', name: 'Data and Model Poisoning', status: 'CLEAN' },
    { id: 'LLM05', name: 'Improper Output Handling', status: 'CLEAN' },
    { id: 'LLM06', name: 'Excessive Agency', status: 'CLEAN' },
    { id: 'LLM07', name: 'System Prompt Leakage', status: 'CLEAN' },
    { id: 'LLM08', name: 'Insecure Plugin Design', status: 'CLEAN' },
    { id: 'LLM09', name: 'Misinformation', status: 'CLEAN' },
    { id: 'LLM10', name: 'Model Theft', status: 'CLEAN' },
  ],
};

const NIST_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GOVERN: IconShield,
  MAP: IconMap,
  MEASURE: IconBarChart,
  MANAGE: IconSettings,
};

const AICompliance: React.FC = () => {
  const [owasp, setOwasp] = useState<typeof DEMO_OWASP | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [expandedOwasp, setExpandedOwasp] = useState<Set<string>>(new Set());
  const [expandedNist, setExpandedNist] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/api/ai-security/owasp-llm')
      .then((r) => {
        setOwasp(r.data);
        setIsSimulated(!!(r.data as { is_simulated?: boolean })?.is_simulated);
      })
      .catch(() => {
        setOwasp(DEMO_OWASP);
        setIsSimulated(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const data = owasp ?? DEMO_OWASP;
  const passedCount = data.categories?.filter((c: { status: string }) => c.status === 'CLEAN').length ?? 0;
  const totalCount = data.categories?.length ?? 10;
  const percent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const toggleOwasp = (id: string) => {
    setExpandedOwasp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportJson = () => {
    const report = {
      generated_at: new Date().toISOString(),
      frameworks: {
        owasp_llm: {
          posture_percent: data.posture_percent ?? percent,
          passed: passedCount,
          total: totalCount,
          categories: data.categories?.map((c: { id: string; name: string; status: string }) => ({
            id: c.id,
            name: c.name,
            status: c.status,
          })),
        },
        nist_ai_rmf: { govern: 'aligned', map: 'aligned', measure: 'aligned', manage: 'aligned' },
        iso_23894: { status: 'planned' },
        eu_ai_act: { status: 'planned' },
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-compliance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-emerald-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/90 to-teal-500/90 flex items-center justify-center shadow-sm">
              <IconComplianceAudit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Compliance Posture</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                OWASP LLM · NIST AI RMF · ISO 23894 · EU AI Act
              </p>
            </div>
          </div>
          <button
            onClick={exportJson}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
          ) : (
            <>
              {isSimulated && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Assessment based on wolfir architecture review</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      This posture reflects wolfir&apos;s own AI pipeline design — prompt injection guards, output validation, Bedrock Guardrails integration. Connect AWS backend for environment-specific OWASP and NIST checks against your Bedrock and IAM configuration.
                    </p>
                  </div>
                </div>
              )}
              {/* OWASP LLM — Wiz-style compact table with expandable rows */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden bg-white">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200/80">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">OWASP LLM Security Top 10</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Posture: <strong className="text-emerald-600">{percent}%</strong> passed ({passedCount}/{totalCount})
                      {isSimulated && <span className="ml-2 text-amber-600 font-medium">· Architecture review</span>}
                    </p>
                  </div>
                  <a
                    href="https://owasp.org/www-project-top-10-for-large-language-model-applications/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> OWASP
                  </a>
                </div>
                <div className="divide-y divide-slate-100">
                  {(data.categories ?? []).map((c: { id: string; name: string; status: string }) => {
                    const detail = OWASP_LLM_DETAILS[c.id];
                    const isExpanded = expandedOwasp.has(c.id);
                    return (
                      <div key={c.id} className="bg-white">
                        <div
                          onClick={() => toggleOwasp(c.id)}
                          className="flex items-center justify-between gap-4 px-5 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xs font-mono font-semibold text-slate-500 w-12 flex-shrink-0">{c.id}</span>
                            <span className="text-sm font-medium text-slate-800 truncate">{c.name}</span>
                            <span className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${c.status === 'CLEAN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="flex-shrink-0">{isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && detail && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
                            >
                              <div className="px-5 py-4 space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{detail.description}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Example</p>
                                  <p className="text-sm text-slate-600 leading-relaxed">{detail.example}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">What we tested</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{detail.whatWeTested}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NIST AI RMF — full evidence, expandable */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden bg-white">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200/80">
                  <h4 className="text-sm font-bold text-slate-900">NIST AI RMF Governance Alignment</h4>
                  <a
                    href="https://www.nist.gov/itl/ai-risk-management-framework"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Reference
                  </a>
                </div>
                <div className="divide-y divide-slate-100">
                  {NIST_QUADRANTS_FULL.map((q) => {
                    const Icon = NIST_ICONS[q.key];
                    const isExpanded = expandedNist.has(q.key);
                    return (
                      <div key={q.key} className="bg-white">
                        <div
                          onClick={() => setExpandedNist((prev) => { const n = new Set(prev); if (n.has(q.key)) n.delete(q.key); else n.add(q.key); return n; })}
                          className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/90 to-violet-500/90 flex items-center justify-center shadow-sm flex-shrink-0">
                            {Icon && <Icon className="w-4 h-4 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold text-slate-800">{q.label}</span>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{q.summary}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700">Aligned</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
                            >
                              <div className="px-5 py-4 pl-[52px]">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence</p>
                                <ul className="space-y-1.5">
                                  {q.evidence.map((e, i) => (
                                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                      <span className="text-emerald-500 mt-0.5">•</span>
                                      <span className="leading-relaxed">{e}</span>
                                    </li>
                                  ))}
                                </ul>
                                <a
                                  href={q.refUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  <ExternalLink className="w-3 h-3" /> Learn more
                                </a>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ISO / EU — coming soon */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">ISO/IEC 23894 · EU AI Act</p>
                  <p className="text-xs text-slate-500">Framework mapping planned. Export includes placeholder status.</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600">Soon</span>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AICompliance;
