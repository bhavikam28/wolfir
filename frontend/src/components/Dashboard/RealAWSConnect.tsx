/**
 * Real AWS Connection - Premium analysis trigger component
 * Two options when connected: Analyze CloudTrail (incident) or Run Security Health Check (proactive)
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Loader2, Calendar, Database, Zap, Shield, Sparkles } from 'lucide-react';

interface RealAWSConnectProps {
  onAnalyze: (daysBack: number, maxEvents: number) => Promise<void>;
  onHealthCheck?: () => Promise<void>;
  loading?: boolean;
  healthCheckLoading?: boolean;
}

const RealAWSConnect: React.FC<RealAWSConnectProps> = ({
  onAnalyze,
  onHealthCheck,
  loading = false,
  healthCheckLoading = false,
}) => {
  const [daysBack, setDaysBack] = useState(30);
  const [maxEvents, setMaxEvents] = useState(200);
  const [showAdvanced, setShowAdvanced] = useState(true);

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 shadow-glow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Analyze Real CloudTrail Events</h3>
          <p className="text-sm text-slate-500">
            Fetch and analyze security events from the past {daysBack} days.
          </p>
        </div>
      </div>

      {/* Time Range Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Time Range
          </label>
          <span className="text-sm font-bold text-indigo-600 tabular-nums">
            {daysBack} {daysBack === 1 ? 'day' : 'days'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="90"
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>1 day</span>
          <span>90 days</span>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Max Events
            </label>
            <span className="text-sm font-bold text-indigo-600 tabular-nums">{maxEvents}</span>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={maxEvents}
            onChange={(e) => setMaxEvents(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </motion.div>
      )}

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold mb-5 block"
      >
        {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
      </button>

      {/* Two options: Health Check (proactive) + CloudTrail (incident) */}
      <div className="space-y-3">
        {onHealthCheck && (
          <button
            onClick={onHealthCheck}
            disabled={healthCheckLoading || loading}
            className="btn-nova w-full px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
          >
            {healthCheckLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Running Security Health Check...</>
            ) : (
              <><Shield className="w-5 h-5" /><Sparkles className="w-4 h-4" /> Run Security Health Check</>
            )}
          </button>
        )}
        <p className="text-[10px] text-slate-500 text-center font-medium">
          {onHealthCheck ? 'No incidents? Check your security posture first.' : ''}
        </p>
        <button
          onClick={() => onAnalyze(daysBack, maxEvents)}
          disabled={loading || healthCheckLoading}
          className="btn-nova w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Real AWS Account...</>
          ) : (
            <><Zap className="w-5 h-5" /> Analyze CloudTrail Events</>
          )}
        </button>
      </div>
    </div>
  );
};

export default RealAWSConnect;
