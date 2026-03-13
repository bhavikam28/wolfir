/**
 * Login / Entry Page — Premium minimal design (Seddle-inspired)
 * Clean, professional gate before Demo or Console
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Cloud, ArrowRight, ArrowLeft } from 'lucide-react';
import WolfirLogo from '../Logo';

interface LoginPageProps {
  onTryDemo: () => void;
  onConnectAWS: () => void;
  onBackToHome?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onTryDemo, onConnectAWS, onBackToHome }) => {
  const goHome = () => {
    if (onBackToHome) onBackToHome();
    else {
      window.location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Back — top-left */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={goHome}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <WolfirLogo size={48} animated={true} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500">
            Sign in to wolfir to continue
          </p>
        </motion.div>

        {/* Two paths — premium cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md space-y-4"
        >
          <button
            onClick={onConnectAWS}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors flex-shrink-0">
              <Cloud className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">Connect AWS Console</p>
              <p className="text-xs text-slate-500 mt-0.5">Use your AWS credentials for live CloudTrail, IAM, and Security Hub analysis</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-slate-400">or</span>
            </div>
          </div>

          <button
            onClick={onTryDemo}
            className="w-full flex items-center gap-4 p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors flex-shrink-0">
              <Play className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">Try Demo</p>
              <p className="text-xs text-slate-500 mt-0.5">Explore with pre-built scenarios — no AWS account required</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center text-xs text-slate-400"
        >
          Credentials stay local — never stored on our servers
        </motion.p>
      </div>

      {/* Footer */}
      <div className="py-4 text-center border-t border-slate-100">
        <a href="#" className="text-[11px] text-slate-400 hover:text-slate-600">Terms</a>
        <span className="mx-2 text-slate-300">·</span>
        <a href="#" className="text-[11px] text-slate-400 hover:text-slate-600">Privacy</a>
        <p className="text-[11px] text-slate-400 mt-1">© 2026 wolfir. All rights reserved.</p>
      </div>
    </div>
  );
};

export default LoginPage;
