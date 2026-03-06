/**
 * Autonomous Agent — Strands Agent autonomously plans and executes tools.
 * The Agent decides which tools to call (CloudTrail, IAM, CloudWatch, etc.)
 * based on your prompt — real agentic reasoning.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Send, Loader2, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { orchestrationAPI } from '../../services/api';

const SUGGESTED_PROMPTS = [
  'Audit all IAM users for security issues',
  'Scan CloudTrail for anomalies in the last 24 hours',
  'Check CloudWatch for billing anomalies',
  'Investigate IAM roles for privilege escalation',
  'Investigate cross-account role assumptions',
];

export default function AgenticQuery() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await orchestrationAPI.agentQuery(trimmed);
      setResponse(result.response || 'No response.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Agent query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 p-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Agentic Query</h2>
            <p className="text-sm text-slate-600">
              The Strands Agent autonomously plans and executes tools — real agentic reasoning
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Click a prompt below or type your own. The Agent plans its execution and calls the right tools.
        </p>
      </motion.div>

      {/* Input */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Your prompt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. Investigate this IAM role for privilege escalation"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="p-4 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Try these</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  setError(null);
                  setResponse(null);
                  setLoading(true);
                  orchestrationAPI.agentQuery(s).then((r) => {
                    setResponse(r.response || 'No response.');
                  }).catch((err: any) => {
                    setError(err.response?.data?.detail || err.message || 'Agent query failed');
                  }).finally(() => setLoading(false));
                }}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Response */}
        {(response || error) && (
          <div className="p-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}
            {response && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Agent response</span>
                  <span className="text-[10px] text-slate-500 ml-auto">Autonomous mode</span>
                </div>
                <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                  {response}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3"
      >
        <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-slate-700">How it works</p>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            The Agent plans its own tool sequence — it chooses CloudTrail, IAM, CloudWatch, or incident history based on your prompt, not a fixed pipeline.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
