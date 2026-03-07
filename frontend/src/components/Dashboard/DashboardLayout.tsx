/**
 * Dashboard Layout - Enterprise sidebar + main content area
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Shield, GitBranch, Scale, DollarSign,
  FileText, Download, Mic, Image, Clock, Database,
  ChevronLeft, ChevronRight as ChevronRightIcon, ArrowLeft, Menu, X, Zap, Lock
} from 'lucide-react';
import NovaSentinelLogo from '../Logo';

export interface SidebarFeature {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
  badge?: string;
  badgeColor?: string;
  group: 'analysis' | 'intelligence' | 'tools' | 'ai_governance';
  requiresAnalysis?: boolean;
}

export const SIDEBAR_FEATURES: SidebarFeature[] = [
  // Analysis group
  { id: 'overview', label: 'Security Overview', icon: LayoutDashboard, locked: false, group: 'analysis' },
  { id: 'timeline', label: 'Incident Timeline', icon: Clock, locked: false, group: 'analysis' },
  { id: 'attack-path', label: 'Attack Path', icon: GitBranch, locked: false, group: 'analysis' },
  { id: 'agentic-query', label: 'Autonomous Agent', icon: Zap, locked: false, badge: 'NEW', badgeColor: 'bg-indigo-100 text-indigo-600', group: 'analysis' },
  { id: 'incident-history', label: 'Incident History', icon: Database, locked: false, group: 'analysis' },
  // Intelligence group
  { id: 'compliance', label: 'Compliance Mapping', icon: Scale, locked: false, badge: '6', group: 'intelligence' },
  { id: 'cost', label: 'Cost Impact', icon: DollarSign, locked: false, group: 'intelligence' },
  { id: 'remediation', label: 'Remediation Engine', icon: Shield, locked: false, group: 'intelligence' },
  // Tools group
  { id: 'visual', label: 'Visual Analysis', icon: Image, locked: false, group: 'tools' },
  { id: 'aria', label: 'Aria Voice AI', icon: Mic, locked: false, group: 'tools' },
  { id: 'documentation', label: 'Documentation', icon: FileText, locked: false, group: 'tools' },
  { id: 'export', label: 'Export Report', icon: Download, locked: false, group: 'tools' },
  { id: 'ai-pipeline', label: 'AI Pipeline Security', icon: Shield, locked: false, group: 'ai_governance' },
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
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups = [
    { key: 'analysis', label: 'Analysis' },
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'tools', label: 'Tools' },
    { key: 'ai_governance', label: 'AI Governance' },
  ];

  const renderSidebar = (isMobile = false) => (
    <div className={`flex flex-col h-full ${isMobile ? '' : ''}`}>
      {/* Sidebar Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-5 border-b border-slate-200/80`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <NovaSentinelLogo size={24} animated={false} />
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Nova Sentinel</h2>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                {mode === 'demo' ? 'Demo Mode' : 'Console'}
              </p>
            </div>
          </div>
        )}
        {collapsed && <NovaSentinelLogo size={24} animated={false} />}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Mode Badge — clickable in demo mode to return to scenario picker */}
      {!collapsed && (
        <div className="px-4 py-3">
          {mode === 'demo' && hasAnalysis && onBackToScenarios ? (
            <button
              onClick={onBackToScenarios}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-center bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 transition-colors cursor-pointer"
              title="Run a different demo scenario"
            >
              Demo Scenarios
            </button>
          ) : (
            <div className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
              mode === 'demo'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                <p className="px-2 mb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
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
                          ? 'text-slate-400 cursor-not-allowed opacity-70'
                          : isActive
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      {isLocked ? (
                        <Lock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      ) : (
                        <feature.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
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
      <div className="px-3 py-3 border-t border-slate-200/80">
        <button
          onClick={onBack}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <ArrowLeft className="w-4 h-4" />
          {!collapsed && <span>Back to Home</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 ${
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
              className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-end p-2">
                <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              {renderSidebar(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
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
                <p className="text-[10px] text-slate-400">
                  {mode === 'demo' ? 'Demo Mode' : 'Live AWS Analysis'}
                </p>
              </div>
            </div>
            {headerRight}
          </div>
        </header>

        {/* Content */}
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