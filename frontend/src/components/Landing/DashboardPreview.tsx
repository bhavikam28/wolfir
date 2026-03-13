/**
 * Dashboard Preview — Embedded screenshot-style view (Seddle-inspired)
 * Dark sidebar + white content. Premium minimal aesthetic.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Clock, GitBranch, Zap, Shield, FileText } from 'lucide-react';
import WolfirLogo, { WolfirWordmark } from '../Logo';

const DashboardPreview: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-300/30"
    >
      {/* Browser chrome */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <div className="w-3 h-3 rounded-full bg-slate-300" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] text-slate-500 font-medium">app.wolfir.io</span>
        </div>
      </div>

      <div className="flex min-h-[420px]">
        {/* Dark sidebar */}
        <aside className="w-48 bg-slate-900 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
            <WolfirLogo size={24} animated={false} />
            <div>
              <WolfirWordmark size="sm" dark className="text-xs leading-tight" />
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Demo Mode</p>
            </div>
          </div>
          <nav className="p-2 flex-1">
            <p className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Analysis</p>
            {[
              { icon: LayoutDashboard, label: 'Security Overview', active: true },
              { icon: Clock, label: 'Incident Timeline' },
              { icon: GitBranch, label: 'Attack Path' },
              { icon: Zap, label: 'Autonomous Agent', badge: 'NEW' },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium mb-0.5 ${
                  item.active ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 text-[8px] font-bold bg-indigo-500/30 text-indigo-300 rounded">NEW</span>
                )}
              </div>
            ))}
            <p className="px-2 py-1 mt-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Intelligence</p>
            {[
              { icon: Shield, label: 'Compliance Mapping' },
              { icon: FileText, label: 'Remediation Engine' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 mb-0.5">
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* White content area */}
        <main className="flex-1 bg-slate-50 p-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900">Security Overview</h3>
            <p className="text-xs text-slate-500">Demo Mode · Live AWS Analysis</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['Root Cause', 'Blast Radius', 'Confidence'].map((label, i) => (
              <div key={label} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-800">
                  {i === 0 ? 'IAM role compromise' : i === 1 ? '3 resources' : '92%'}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Incident Timeline</p>
            <div className="space-y-2">
              {['ConsoleLogin (root)', 'CreateAccessKey', 'AuthorizeSecurityGroupIngress'].map((evt, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-medium text-slate-700">{evt}</span>
                  <span className="ml-auto text-[10px] text-slate-400">2m ago</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </motion.div>
  );
};

export default DashboardPreview;
