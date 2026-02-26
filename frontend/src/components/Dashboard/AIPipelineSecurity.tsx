/**
 * AI Pipeline Security — MITRE ATLAS and NIST AI RMF
 * "Who protects the AI?"
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface Technique {
  id: string;
  name: string;
  status: string;
  last_checked: string;
  details: string;
}

export default function AIPipelineSecurity() {
  const [status, setStatus] = useState<{ techniques?: Technique[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/ai-security/status').then((r) => setStatus(r.data)).catch(() => setStatus(null)).finally(() => setLoading(false));
  }, []);

  const techniques = status?.techniques || [];
  const getStatusColor = (s: string) => s === 'CLEAN' ? 'border-emerald-300 bg-emerald-50' : s === 'WARNING' ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50';

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white"
      >
        <div className="flex items-start gap-4">
          <Shield className="w-10 h-10 text-indigo-400 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold mb-1">AI Pipeline Security</h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              In an era where AI systems are themselves attack surfaces, Nova Sentinel monitors the security of its own AI pipeline using MITRE ATLAS, the threat framework built specifically for AI/ML systems.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Loading...</div>
      ) : (
        <>
          {/* MITRE ATLAS Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techniques.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border-2 p-4 ${getStatusColor(t.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">{t.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === 'CLEAN' ? 'bg-emerald-200 text-emerald-800' :
                    t.status === 'WARNING' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {t.status === 'CLEAN' ? '🟢 CLEAN' : t.status === 'WARNING' ? '⚠️ WARNING' : '🔴 ALERT'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{t.name}</h3>
                <p className="text-xs text-slate-600 mb-2">{t.details}</p>
                <p className="text-[10px] text-slate-500">Last checked: {t.last_checked?.slice(11, 19) || '—'} ago</p>
              </motion.div>
            ))}
          </div>

          {/* NIST AI RMF */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="text-sm font-bold text-slate-900 mb-4">NIST AI RMF Governance Alignment</h3>
            <div className="grid grid-cols-2 gap-4">
              {['GOVERN', 'MAP', 'MEASURE', 'MANAGE'].map((q) => (
                <div key={q} className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">{q} ✅</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {q === 'GOVERN' && 'Multi-agent oversight with human-in-loop approval gates.'}
                    {q === 'MAP' && 'Threat taxonomy mapped to MITRE ATLAS (6 techniques).'}
                    {q === 'MEASURE' && 'Risk scoring on every incident 0-100 via Nova Micro.'}
                    {q === 'MANAGE' && 'Autonomous + human-approved remediation with rollback.'}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
