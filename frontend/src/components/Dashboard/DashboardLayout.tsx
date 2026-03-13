/**
 * Dashboard Layout - Enterprise sidebar + main content area
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight as ChevronRightIcon, ArrowLeft, Menu, X, Lock
} from 'lucide-react';
import WolfirLogo, { WolfirWordmark } from '../Logo';
import { maskAccountId } from '../../utils/formatting';
import {
  IconOverview, IconTimeline, IconAttackPath, IconAgent, IconHistory,
  IconCompliance, IconCost, IconRemediation, IconVisual, IconVoice,
  IconDocumentation, IconExport, IconAIPipeline, IconGraph, IconChangeSet, IconHealthCheck
} from '../ui/MinimalIcons';

export interface SidebarFeature {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
  badge?: string;
  badgeColor?: string;
  group: 'ai_security' | 'analysis' | 'intelligence' | 'tools';
  requiresAnalysis?: boolean;
}

export const SIDEBAR_FEATURES: SidebarFeature[] = [
  // Analysis group first — judges look at overview first
  { id: 'overview', label: 'Security Overview', icon: IconOverview, locked: false, group: 'analysis' },
  { id: 'ai-pipeline', label: 'AI Security Posture', icon: IconAIPipeline, locked: false, group: 'ai_security' },
  { id: 'security-graph', label: 'Security Graph', icon: IconGraph, locked: false, group: 'ai_security' },
  { id: 'ai-compliance', label: 'AI Compliance', icon: IconCompliance, locked: false, group: 'ai_security' },
  { id: 'timeline', label: 'Incident Timeline', icon: IconTimeline, locked: false, group: 'analysis', requiresAnalysis: true },
  { id: 'attack-path', label: 'Attack Path', icon: IconAttackPath, locked: false, group: 'analysis' },
  { id: 'changeset', label: 'ChangeSet Risk', icon: IconChangeSet, locked: false, badge: 'NEW', badgeColor: 'bg-indigo-100 text-indigo-600', group: 'analysis' },
  { id: 'agentic-query', label: 'Autonomous Agent', icon: IconAgent, locked: false, badge: 'NEW', badgeColor: 'bg-indigo-100 text-indigo-600', group: 'analysis' },
  { id: 'incident-history', label: 'Incident History', icon: IconHistory, locked: false, group: 'analysis' },
  // Intelligence group
  { id: 'compliance', label: 'Compliance Mapping', icon: IconCompliance, locked: false, badge: '6', group: 'intelligence' },
  { id: 'cost', label: 'Cost Impact', icon: IconCost, locked: false, group: 'intelligence' },
  { id: 'remediation', label: 'Remediation Engine', icon: IconRemediation, locked: false, group: 'intelligence' },
  { id: 'protocol', label: 'IR Protocol', icon: IconHealthCheck, locked: false, badge: 'NIST', badgeColor: 'bg-emerald-100 text-emerald-600', group: 'intelligence' },
  // Tools group
  { id: 'visual', label: 'Architecture & STRIDE', icon: IconVisual, locked: false, group: 'tools' },
  { id: 'aria', label: 'Aria Voice AI', icon: IconVoice, locked: false, group: 'tools' },
  { id: 'documentation', label: 'Documentation', icon: IconDocumentation, locked: false, group: 'tools' },
  { id: 'export', label: 'Export Report', icon: IconExport, locked: false, group: 'tools' },
];

interface DashboardLayoutProps {
  mode: 'demo' | 'console';
  activeFeature: string;
  onFeatureChange: (featureId: string) => void;
  onBack: () => void;
  /** When in demo mode, clicking "Demo Scenarios" calls this to return to scenario picker */
  onBackToScenarios?: () => void;
  hasAnalysis?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  /** AWS account ID when connected in console mode — shown in sidebar */
  awsAccountId?: string | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  mode,
  activeFeature,
  onFeatureChange,
  onBack,
  onBackToScenarios,
  hasAnalysis,
  children,
  headerRight,
  awsAccountId,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups = [
    { key: 'analysis', label: 'Quick Start' },
    { key: 'ai_security', label: 'AI Security Posture' },
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'tools', label: 'Utilities' },
  ];

  const renderSidebar = (isMobile = false) => (
    <div className={`flex flex-col h-full ${isMobile ? '' : ''}`}>
      {/* Sidebar Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-5 border-b border-slate-700/50`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <WolfirLogo size={24} animated={false} />
            <div>
              <WolfirWordmark size="sm" dark />
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {mode === 'demo' ? 'Demo Mode' : 'Console'}
              </p>
            </div>
          </div>
        )}
        {collapsed && <WolfirLogo size={24} animated={false} />}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Connected account badge (console mode) */}
      {!collapsed && mode === 'console' && awsAccountId && (
        <div className="px-4 py-2">
          <div className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 truncate" title={`Connected: ${awsAccountId}`}>
            Connected: {maskAccountId(awsAccountId)}
          </div>
        </div>
      )}
      {/* Mode Badge — clickable in demo mode to return to scenario picker */}
      {!collapsed && (
        <div className="px-4 py-3">
          {mode === 'demo' && hasAnalysis && onBackToScenarios ? (
            <button
              onClick={onBackToScenarios}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-center bg-slate-700/50 text-slate-200 border border-slate-600 hover:bg-slate-600/50 transition-colors cursor-pointer"
              title="Run a different demo scenario"
            >
              Demo Scenarios
            </button>
          ) : (
            <div className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
              mode === 'demo'
                ? 'bg-slate-700/50 text-slate-200 border border-slate-600'
                : 'bg-slate-700/50 text-slate-200 border border-slate-600'
            }`}>
              {mode === 'demo' ? 'Demo Scenarios' : 'Live AWS Console'}
            </div>
          )}
        </div>
      )}

      {/* Feature Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => {
          const features = SIDEBAR_FEATURES.filter(f => f.group === group.key);
          return (
            <div key={group.key} className="mb-4">
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {features.map((feature) => {
                  const isActive = activeFeature === feature.id;
                  const isLocked = !hasAnalysis && feature.requiresAnalysis;
                  
                  return (
                    <button
                      key={feature.id}
                      onClick={() => {
                        if (isLocked) return;
                        onFeatureChange(feature.id);
                        if (isMobile) setMobileOpen(false);
                      }}
                      title={collapsed ? feature.label : isLocked ? `${feature.label} — run analysis first` : undefined}
                      disabled={isLocked}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        isLocked
                          ? 'text-slate-500 cursor-not-allowed opacity-70'
                          : isActive
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      {isLocked ? (
                        <Lock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      ) : (
                        <feature.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      )}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{feature.label}</span>
                          {feature.badge && !isLocked && (
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full ${
                              isActive ? 'bg-white/20 text-white' : feature.badgeColor || 'bg-slate-100 text-slate-500'
                            }`}>
                              {feature.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="px-3 py-3 border-t border-slate-700/50">
        <button
          onClick={onBack}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <ArrowLeft className="w-4 h-4" />
          {!collapsed && <span>Back to Home</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Desktop Sidebar — premium dark theme with subtle transition to content */}
      <aside className={`hidden lg:flex flex-col bg-slate-900/95 border-r border-slate-700/50 transition-all duration-300 flex-shrink-0 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.15)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}>
        {renderSidebar()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-slate-900/98 border-r border-slate-700/50 z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-end p-2">
                <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-slate-700/50 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {renderSidebar(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — white to match content */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {SIDEBAR_FEATURES.find(f => f.id === activeFeature)?.label || 'Dashboard'}
                </h1>
                <p className="text-[10px] text-slate-500">
                  {mode === 'demo' ? 'Demo Mode' : 'Live AWS Analysis'}
                </p>
              </div>
            </div>
            {headerRight}
          </div>
        </header>

        {/* Content — white main area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;