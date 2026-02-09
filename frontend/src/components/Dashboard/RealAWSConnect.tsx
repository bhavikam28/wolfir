/**
 * Real AWS Account Connection Component
 * Connect to your AWS account and analyze real CloudTrail events
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, AlertCircle, CheckCircle2, Loader2, Calendar, Database } from 'lucide-react';

interface RealAWSConnectProps {
  onAnalyze: (daysBack: number, maxEvents: number) => Promise<void>;
  loading?: boolean;
}

const RealAWSConnect: React.FC<RealAWSConnectProps> = ({ onAnalyze, loading = false }) => {
  const [daysBack, setDaysBack] = useState(7);
  const [maxEvents, setMaxEvents] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAnalyze = async () => {
    await onAnalyze(daysBack, maxEvents);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-8 mb-8 shadow-lg">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Analyze Real AWS Account
          </h3>
          <p className="text-slate-600">
            Connect to your AWS account and analyze real CloudTrail events from the past {daysBack} days.
            Nova Sentinel will identify actual security incidents in your infrastructure.
          </p>
        </div>
      </div>

      {/* AWS Account Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-indigo-900">AWS Credentials Configured</span>
        </div>
        <p className="text-sm text-indigo-700">
          Using AWS profile: <code className="bg-indigo-100 px-2 py-0.5 rounded">secops-lens</code> | 
          Region: <code className="bg-indigo-100 px-2 py-0.5 rounded">us-east-1</code>
        </p>
        <p className="text-xs text-indigo-600 mt-2">
          CloudTrail events will be fetched directly from your AWS account using your configured credentials.
        </p>
      </div>

      {/* Analysis Parameters */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Time Range
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="90"
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-slate-900 min-w-[80px]">
              {daysBack} {daysBack === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyze CloudTrail events from the past {daysBack} days
          </p>
        </div>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Max Events
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={maxEvents}
                onChange={(e) => setMaxEvents(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-slate-900 min-w-[80px]">
                {maxEvents} events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maximum number of CloudTrail events to analyze (more events = more accurate but slower)
            </p>
          </motion.div>
        )}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing Real AWS Account...</span>
          </>
        ) : (
          <>
            <Cloud className="w-5 h-5" />
            <span>Analyze Real CloudTrail Events</span>
          </>
        )}
      </button>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600">
            <strong>Note:</strong> This will fetch and analyze real CloudTrail events from your AWS account.
            Only security-relevant events (IAM changes, security group modifications, etc.) will be analyzed.
            Your AWS credentials must have CloudTrail read permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealAWSConnect;
