/**
 * Incident History — Cross-incident memory and correlation dashboard
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database, AlertTriangle, CheckCircle2, Search, Link2,
  Shield, TrendingUp
} from 'lucide-react';
import { incidentHistoryAPI } from '../../services/api';

interface Incident {
  incident_id: string;
  account_id?: string;
  timestamp: string;
  severity: string;
  attack_type: string;
  mitre_techniques: string[];
  affected_resources?: string[];
  risk_score: number;
  summary?: string;
  remediation_status?: string;
  ioc_indicators?: string[];
}

interface IncidentHistoryProps {
  accountId?: string;
  onSelectIncident?: (incidentId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-emerald-100 text-emerald-700',
};

function formatTimestamp(ts: string): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return ts?.slice(0, 19) || '—';
  }
}

export default function IncidentHistory({ accountId = 'demo-account', onSelectIncident }: IncidentHistoryProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [correlations, setCorrelations] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes, corrRes] = await Promise.all([
        incidentHistoryAPI.list(accountId),
        incidentHistoryAPI.stats(accountId),
        incidentHistoryAPI.correlations(accountId),
      ]);
      setIncidents(listRes.incidents || []);
      setStats(statsRes);
      setCorrelations(corrRes);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load incident history');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const hasActiveCampaign = correlations?.campaign_probability > 0.6 || (correlations?.active_campaigns?.length ?? 0) > 0;
  const campaignProb = correlations?.campaign_probability ?? 0;

  return (
    <div className="space-y-6">
      {/* Cross-Incident Intelligence Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cross-Incident Memory</h2>
              <p className="text-xs text-slate-500">
                Memory active: {stats?.total_incidents ?? incidents.length} incidents tracked
                {stats && ` • Last updated: ${new Date().toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveCampaign ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">Active Campaign Detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">No Active Campaigns</span>
              </div>
            )}
          </div>
        </div>

        {hasActiveCampaign && correlations?.active_campaigns?.[0] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200"
          >
            <p className="text-xs font-bold text-amber-800 mb-1">⚠️ CAMPAIGN ALERT</p>
            <p className="text-xs text-amber-700">
              {Math.round(campaignProb * 100)}% probability that incidents{' '}
              {correlations.pattern_matches?.map((p: any) => p.incident_id).join(', ') || 'recent'} are part of a coordinated attack.
              {correlations.active_campaigns?.[0]?.correlation_summary && (
                <span className="block mt-2">{correlations.active_campaigns[0].correlation_summary}</span>
              )}
            </p>
          </motion.div>
        )}
      </motion.div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {error}
          <button onClick={loadData} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by incident ID, attack type, MITRE technique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Incident Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-bold text-slate-700">Date/Time</th>
              <th className="px-4 py-3 font-bold text-slate-700">Incident ID</th>
              <th className="px-4 py-3 font-bold text-slate-700">Severity</th>
              <th className="px-4 py-3 font-bold text-slate-700">Attack Type</th>
              <th className="px-4 py-3 font-bold text-slate-700">MITRE Techniques</th>
              <th className="px-4 py-3 font-bold text-slate-700">Risk</th>
              <th className="px-4 py-3 font-bold text-slate-700">Status</th>
              <th className="px-4 py-3 font-bold text-slate-700">Correlation</th>
            </tr>
          </thead>
          <tbody>
            {(incidents || [])
              .filter((inc) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (inc.incident_id || '').toLowerCase().includes(q) ||
                  (inc.attack_type || '').toLowerCase().includes(q) ||
                  (inc.summary || '').toLowerCase().includes(q) ||
                  (inc.mitre_techniques || []).some((t) => t?.toLowerCase().includes(q))
                );
              })
              .map((inc, i) => (
                <motion.tr
                  key={inc.incident_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${onSelectIncident ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectIncident?.(inc.incident_id)}
                >
                  <td className="px-4 py-3 text-slate-600">{formatTimestamp(inc.timestamp)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {inc.incident_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        SEVERITY_COLORS[inc.severity] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={inc.attack_type}>
                    {inc.attack_type}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(inc.mitre_techniques || []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                      {(inc.mitre_techniques?.length || 0) > 3 && (
                        <span className="text-slate-400 text-[10px]">+{(inc.mitre_techniques?.length || 0) - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, inc.risk_score)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{inc.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{inc.remediation_status || 'generated'}</td>
                  <td className="px-4 py-3">
                    {correlations?.pattern_matches?.some((p: any) => p.incident_id === inc.incident_id) ? (
                      <Link2 className="w-4 h-4 text-indigo-500" title="Linked to campaign" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
          </tbody>
        </table>
        {(!incidents || incidents.length === 0) && !loading && (
          <div className="p-12 text-center text-slate-500 text-sm">
            No incidents in memory yet. Run a demo or real AWS analysis to populate.
          </div>
        )}
      </div>

      {/* Pattern Analysis */}
      {stats && (stats.top_attack_types?.length > 0 || stats.top_mitre_techniques?.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Most Common Attack Types
            </h3>
            <div className="space-y-2">
              {(stats.top_attack_types || []).map((a: any) => (
                <div key={a.attack_type} className="flex items-center gap-2">
                  <div
                    className="h-2 rounded bg-indigo-200 overflow-hidden flex-1 max-w-[200px]"
                    style={{ width: '100%' }}
                  >
                    <div
                      className="h-full bg-indigo-500 rounded"
                      style={{
                        width: `${Math.min(100, (a.count / (stats.total_incidents || 1)) * 100 * 3)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 truncate max-w-[140px]">{a.attack_type}</span>
                  <span className="text-xs font-semibold text-slate-700">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Recurring MITRE Techniques
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(stats.top_mitre_techniques || []).map((t: any) => (
                <span
                  key={t.technique}
                  className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                >
                  {t.technique} ({t.count})
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
