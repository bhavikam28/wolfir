/**
 * Tabbed Interface for Real AWS vs Demo Scenarios
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, PlayCircle, CheckCircle2 } from 'lucide-react';

interface AnalysisTabsProps {
  children: {
    realAWS: React.ReactNode;
    demo: React.ReactNode;
  };
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'real' | 'demo'>('real');

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('real')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-all relative ${
            activeTab === 'real'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Cloud className={`w-5 h-5 ${activeTab === 'real' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Real AWS Account</span>
            {activeTab === 'real' && (
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-all relative ${
            activeTab === 'demo'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <PlayCircle className={`w-5 h-5 ${activeTab === 'demo' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Demo Scenarios</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'real' ? children.realAWS : children.demo}
      </motion.div>
    </div>
  );
};

export default AnalysisTabs;
