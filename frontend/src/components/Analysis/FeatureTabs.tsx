/**
 * Feature Tabs - Post-analysis tabbed navigation
 * Each tab is a clearly named feature of the platform
 */
import React from 'react';
import {
  LayoutDashboard, Clock, GitBranch, Scale, DollarSign,
  Shield, FileText, Download
} from 'lucide-react';

export interface FeatureTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export const ANALYSIS_TABS: FeatureTab[] = [
  { id: 'overview', label: 'Security Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'timeline', label: 'Incident Timeline', shortLabel: 'Timeline', icon: Clock },
  { id: 'attack-path', label: 'Attack Path', shortLabel: 'Attack Path', icon: GitBranch },
  { id: 'compliance', label: 'Compliance Mapping', shortLabel: 'Compliance', icon: Scale, badge: '6 Frameworks', badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: 'cost', label: 'Cost Impact', shortLabel: 'Cost', icon: DollarSign },
  { id: 'remediation', label: 'Remediation Engine', shortLabel: 'Remediation', icon: Shield },
  { id: 'documentation', label: 'Documentation', shortLabel: 'Docs', icon: FileText },
  { id: 'export', label: 'Export Report', shortLabel: 'Export', icon: Download },
];

interface FeatureTabsNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  availableTabs?: string[];
}

const FeatureTabsNav: React.FC<FeatureTabsNavProps> = ({
  activeTab,
  onTabChange,
  availableTabs,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Feature tabs header label */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analysis Features</p>
      </div>
      
      {/* Scrollable tabs */}
      <div className="px-4 py-3 flex gap-1 overflow-x-auto scrollbar-none">
        {ANALYSIS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAvailable = !availableTabs || availableTabs.includes(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => isAvailable && onTabChange(tab.id)}
              disabled={!isAvailable}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isAvailable
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
              {tab.badge && isActive && (
                <span className="text-[8px] px-1.5 py-0.5 bg-white/20 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureTabsNav;
