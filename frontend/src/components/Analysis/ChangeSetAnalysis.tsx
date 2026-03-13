/**
 * ChangeSet Analysis — Attack path–aware CloudFormation ChangeSet risk assessment
 * Analyzes ChangeSets for changes that could create or widen attack paths.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Cloud, Layers, ExternalLink, Copy
} from 'lucide-react';
import { changesetAPI, healthCheck } from '../../services/api';

// Demo fallback when backend is offline (e.g. Vercel)
const DEMO_RESULT = {
  stack_name: 'demo-stack',
  change_set_name: 'demo-changeset-001',
  change_set_status: 'CREATE_COMPLETE',
  risk_score: 65,
  risk_level: 'high',
  risky_changes: [
    { logical_id: 'WebServerRole', resource_type: 'AWS::IAM::Role', action: 'Modify', physical_id: 'arn:aws:iam::123456789012:role/WebServerRole', risk_score: 8, reason: 'High-impact resource: AWS::IAM::Role — can affect IAM, network, or data access' },
    { logical_id: 'WebServerSG', resource_type: 'AWS::EC2::SecurityGroup', action: 'Modify', physical_id: 'sg-0123456789abcdef0', risk_score: 8, reason: 'High-impact resource: AWS::EC2::SecurityGroup — can affect IAM, network, or data access' },
    { logical_id: 'DataBucket', resource_type: 'AWS::S3::Bucket', action: 'Replace', physical_id: '(new)', risk_score: 9, reason: 'Replace / Replacement — resource will be replaced or removed' },
  ],
  attack_path_implication: 'IAM changes — may create privilege escalation or new attack paths. Security group changes — may expose resources to the internet. S3 or bucket policy changes — may affect data access or exfiltration risk. Resource replacement or deletion — verify no unintended blast radius.',
  total_changes: 5,
  recommendation: 'Require human approval before deployment.',
};

interface ChangeSetAnalysisProps {
  backendOffline?: boolean;
}

const ChangeSetAnalysis: React.FC<ChangeSetAnalysisProps> = ({ backendOffline: propBackendOffline }) => {
  const [stackName, setStackName] = useState('');
  const [changeSetName, setChangeSetName] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<typeof DEMO_RESULT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set());
  const [changeSetOptions, setChangeSetOptions] = useState<Array<{ change_set_name: string; status: string }>>([]);
  const [loadingChangeSets, setLoadingChangeSets] = useState(false);

  const loadChangeSets = async () => {
    if (!stackName.trim()) return;
    setLoadingChangeSets(true);
    setChangeSetOptions([]);
    setError(null);
    try {
      const backendAvailable = await healthCheck();
      if (!backendAvailable) {
        setError('Backend unavailable. Enter ChangeSet name manually.');
        return;
      }
      const res = await changesetAPI.listChangeSets(stackName.trim(), region.trim() || undefined);
      const opts = (res.change_sets || []).map((cs: { change_set_name: string; status: string }) => ({
        change_set_name: cs.change_set_name,
        status: cs.status,
      }));
      setChangeSetOptions(opts);
      if (opts.length > 0 && !changeSetName) setChangeSetName(opts[0].change_set_name);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load ChangeSets.';
      setError(msg);
    } finally {
      setLoadingChangeSets(false);
    }
  };

  const runAnalysis = async () => {
    if (!stackName.trim() || !changeSetName.trim()) {
      setError('Stack name and ChangeSet name are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const backendAvailable = await healthCheck();
      if (!backendAvailable) {
        setResult(DEMO_RESULT);
        return;
      }
      const res = await changesetAPI.analyze(stackName.trim(), changeSetName.trim(), region.trim() || undefined);
      setResult({ ...DEMO_RESULT, ...res } as typeof DEMO_RESULT);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Analysis failed.';
      setError(msg);
      if (propBackendOffline || msg?.toLowerCase?.().includes('network') || msg?.toLowerCase?.().includes('unreachable')) {
        setResult(DEMO_RESULT);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleChange = (i: number) => {
    setExpandedChanges(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const getRiskBadge = (level: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return styles[level.toLowerCase()] || styles.medium;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Attack Path–Aware ChangeSet Analysis</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Analyze CloudFormation ChangeSets for risk and impact on attack paths — IAM, security groups, S3, and more.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Stack Name</label>
              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                placeholder="my-app-stack"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">ChangeSet Name</label>
              <div className="flex gap-2">
                {changeSetOptions.length > 0 ? (
                  <select
                    value={changeSetName}
                    onChange={(e) => setChangeSetName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">Select ChangeSet...</option>
                    {changeSetOptions.map((cs) => (
                      <option key={cs.change_set_name} value={cs.change_set_name}>
                        {cs.change_set_name} ({cs.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={changeSetName}
                    onChange={(e) => setChangeSetName(e.target.value)}
                    placeholder="my-changeset-001"
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                )}
                <button
                  type="button"
                  onClick={loadChangeSets}
                  disabled={!stackName.trim() || loadingChangeSets}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
                >
                  {loadingChangeSets ? '...' : 'Load'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Region (optional)</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Analyze ChangeSet
                </>
              )}
            </button>
            <a
              href="https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink className="w-3.5 h-3.5" /> CloudFormation docs
            </a>
            {result && (
              <button
                type="button"
                onClick={() => {
                  const json = JSON.stringify(result, null, 2);
                  navigator.clipboard?.writeText(json);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
              >
                <Copy className="w-3 h-3" /> Copy JSON
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{result.stack_name}</h4>
                  <p className="text-xs text-slate-500">{result.change_set_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getRiskBadge(result.risk_level)}`}>
                  {result.risk_level.toUpperCase()} — {result.risk_score}%
                </span>
                {result.change_set_status && (
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {result.change_set_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <p className="text-xs font-bold text-indigo-800 mb-1">Attack Path Implication</p>
              <p className="text-sm text-indigo-700">{result.attack_path_implication}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-700 mb-1">Recommendation</p>
              <p className="text-sm text-slate-600">{result.recommendation}</p>
            </div>

            {result?.risky_changes?.some(r => String(r.resource_type || '').includes('IAM')) && (
              <a
                href="https://aegis-iam.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Analyze IAM changes with Aegis IAM
              </a>
            )}

            {result.risky_changes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-3">
                  Risky Changes ({result.risky_changes.length} of {result.total_changes} total)
                </p>
                <div className="space-y-2">
                  {result.risky_changes.map((r, i) => (
                    <div
                      key={i}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => toggleChange(i)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.risk_score >= 8 ? 'bg-red-100 text-red-700 border-red-200' :
                            r.risk_score >= 5 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {r.risk_score}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800 truncate">{r.logical_id}</span>
                          <span className="text-[11px] text-slate-500 truncate">{r.resource_type}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {r.action}
                          </span>
                        </div>
                        {expandedChanges.has(i) ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>
                      {expandedChanges.has(i) && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                          <p className="text-xs text-slate-600 mt-2">{r.reason}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">{r.physical_id}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.risky_changes.length === 0 && result.total_changes > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-800">No high-risk changes detected. {result.total_changes} changes analyzed.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChangeSetAnalysis;
