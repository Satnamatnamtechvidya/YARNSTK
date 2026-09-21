import React from 'react';
import { 
  BarChart3, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers,
  Building2,
  Users
} from 'lucide-react';
import { ActiveSheetTab } from '../types';

interface TabBarProps {
  activeTab: ActiveSheetTab;
  onSelectTab: (tab: ActiveSheetTab) => void;
  reportCount: number;
  purchaseCount: number;
  issueCount: number;
  itemCount: number;
  partyCount?: number;
  partyReportCount?: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onSelectTab,
  reportCount,
  purchaseCount,
  issueCount,
  itemCount,
  partyCount = 0,
  partyReportCount = 0,
}) => {
  const tabs = [
    {
      id: 'report' as ActiveSheetTab,
      label: 'Stock Report',
      icon: BarChart3,
      count: reportCount,
      countLabel: 'items',
      color: 'blue',
      badgeBg: 'bg-blue-100 text-blue-700',
      activeBorder: 'border-b-blue-600 text-blue-700 bg-white shadow-xs',
    },
    {
      id: 'purchase' as ActiveSheetTab,
      label: 'Purchase Sheet',
      icon: ArrowDownLeft,
      count: purchaseCount,
      countLabel: 'entries',
      color: 'emerald',
      badgeBg: 'bg-emerald-100 text-emerald-700',
      activeBorder: 'border-b-emerald-600 text-emerald-700 bg-white shadow-xs',
    },
    {
      id: 'issue' as ActiveSheetTab,
      label: 'Issue Sheet',
      icon: ArrowUpRight,
      count: issueCount,
      countLabel: 'entries',
      color: 'amber',
      badgeBg: 'bg-amber-100 text-amber-800',
      activeBorder: 'border-b-amber-600 text-amber-800 bg-white shadow-xs',
    },
    {
      id: 'party-report' as ActiveSheetTab,
      label: 'Party Report',
      icon: Users,
      count: partyReportCount,
      countLabel: 'parties',
      color: 'teal',
      badgeBg: 'bg-teal-100 text-teal-800',
      activeBorder: 'border-b-teal-600 text-teal-800 bg-white shadow-xs',
    },
    {
      id: 'parties' as ActiveSheetTab,
      label: 'Party Master',
      icon: Building2,
      count: partyCount,
      countLabel: 'parties',
      color: 'indigo',
      badgeBg: 'bg-indigo-100 text-indigo-700',
      activeBorder: 'border-b-indigo-600 text-indigo-700 bg-white shadow-xs',
    },
    {
      id: 'items' as ActiveSheetTab,
      label: 'Item Master',
      icon: Layers,
      count: itemCount,
      countLabel: 'codes',
      color: 'purple',
      badgeBg: 'bg-purple-100 text-purple-700',
      activeBorder: 'border-b-purple-600 text-purple-700 bg-white shadow-xs',
    },
  ];

  return (
    <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Workbook Sheets Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2 hidden lg:flex items-center gap-1.5 mr-1 border-r border-slate-300">
            <span>Sheets:</span>
          </div>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-t-md transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? `${tab.activeBorder} font-semibold border-t border-l border-r border-slate-200 -mb-[1px]`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? tab.badgeBg : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
