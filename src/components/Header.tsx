import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Trash2, 
  Plus, 
  Printer,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Cloud,
  CheckCircle2,
  Database,
  ShieldCheck,
  UserCheck,
  Lock,
  LogOut
} from 'lucide-react';
import { ActiveSheetTab, GoogleSheetConnection, UserRole } from '../types';

interface HeaderProps {
  activeTab: ActiveSheetTab;
  onSelectTab: (tab: ActiveSheetTab) => void;
  onOpenQuickEntry: (type: 'purchase' | 'issue' | 'item') => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
  onResetData: () => void;
  onOpenGoogleSheets: () => void;
  googleSheetConnection: GoogleSheetConnection | null;
  onOpenSupabase?: () => void;
  isSupabaseActive?: boolean;
  totalStockWeight: number;
  totalItemsCount: number;
  totalPurchasesCount: number;
  totalIssuesCount: number;
  currentRole: UserRole;
  onOpenRoleModal: (reason?: string) => void;
  onLogout?: () => void;
  operatorName?: string;
  isCloudLive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickEntry,
  onExportExcel,
  onImportExcel,
  onResetData,
  onOpenGoogleSheets,
  googleSheetConnection,
  onOpenSupabase,
  isSupabaseActive = false,
  totalStockWeight,
  totalItemsCount,
  totalPurchasesCount,
  totalIssuesCount,
  currentRole,
  onOpenRoleModal,
  onLogout,
  operatorName,
  isCloudLive = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
      e.target.value = '';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & Workbook Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm text-white">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Stock & Inventory Workbook
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-mono font-medium border border-emerald-200">
                .XLSX
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Purchase, Issue, Item Master & Balance Report with Auto-Lookup
            </p>
          </div>
        </div>

        {/* Live Metrics Chips */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-2xs">
            <Boxes className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Balance Stock:</span>
            <span className="font-mono font-bold text-emerald-700">
              {totalStockWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-2xs">
            <span className="text-slate-500">Items:</span>
            <span className="font-mono font-semibold text-slate-800">{totalItemsCount}</span>
          </div>

          {/* Cloud Database Auto-Sync Badge */}
          <div
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border text-xs shadow-2xs ${
              isCloudLive
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title="Cloud Server Database: Real-time multi-device sync is active across all team members"
          >
            <Cloud className={`w-3.5 h-3.5 ${isCloudLive ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="font-medium hidden sm:inline">Cloud:</span>
            <span className="font-semibold">{isCloudLive ? 'Live Sync' : 'Offline'}</span>
            <span className={`w-2 h-2 rounded-full ${isCloudLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Quick Record Add Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="btn-quick-purchase"
              onClick={() => onOpenQuickEntry('purchase')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5 rounded font-medium transition-colors shadow-2xs"
              title="Add New Purchase Entry"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Purchase</span>
            </button>

            <button
              id="btn-quick-issue"
              onClick={() => onOpenQuickEntry('issue')}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-2.5 py-1.5 rounded font-medium transition-colors shadow-2xs"
              title="Add New Issue Entry"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ Issue</span>
            </button>

            <button
              id="btn-quick-item"
              onClick={() => onOpenQuickEntry('item')}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1.5 rounded font-medium transition-colors border border-slate-300 shadow-2xs"
              title="Create New Item in Master"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Item</span>
            </button>
          </div>

          {/* Export / Import, Google Sheets, Supabase & Print Actions */}
          <div className="flex items-center gap-1.5">
            {/* Role Indicator & Switcher Button */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-role-switcher"
                onClick={() => onOpenRoleModal()}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer border shadow-2xs ${
                  currentRole === 'admin'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-300/40'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                }`}
                title={
                  currentRole === 'admin'
                    ? `Active Role: Administrator ${operatorName ? `(${operatorName})` : ''} - Full edit & delete permissions. Click to switch.`
                    : `Active Role: User ${operatorName ? `(${operatorName})` : ''} - Entry mode. Click to unlock Admin.`
                }
              >
                {currentRole === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-amber-950">{operatorName || 'Admin'}</span>
                    <span className="text-[10px] bg-amber-200/60 text-amber-900 px-1 py-0.2 rounded font-mono hidden sm:inline">Admin</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-blue-950">{operatorName || 'User'}</span>
                    <span className="text-[10px] bg-blue-200/60 text-blue-900 px-1 py-0.2 rounded font-mono hidden sm:inline">Entry</span>
                  </>
                )}
              </button>

              {/* Logout Button */}
              {onLogout && (
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shadow-2xs"
                  title="Log out: Lock session and require login to re-enter"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>

            {/* Supabase Database Button */}
            {onOpenSupabase && (
              <button
                id="btn-supabase-db"
                onClick={onOpenSupabase}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all cursor-pointer shadow-2xs border ${
                  isSupabaseActive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-emerald-700 hover:border-emerald-400'
                }`}
                title={
                  isSupabaseActive
                    ? 'Supabase Database Connected: Click to Sync, Pull data, or view SQL schema'
                    : 'Configure Supabase Database for persistent cloud storage'
                }
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Supabase</span>
                {isSupabaseActive ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                ) : (
                  <span className="text-[10px] text-slate-500">DB</span>
                )}
              </button>
            )}

            {/* Google Sheets Sync Button */}
            <button
              id="btn-google-sheets"
              onClick={onOpenGoogleSheets}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all cursor-pointer shadow-2xs border ${
                googleSheetConnection
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-emerald-700 hover:border-emerald-400'
              }`}
              title={
                googleSheetConnection
                  ? `Google Sheet Connected: ${googleSheetConnection.spreadsheetTitle} (Click to Sync / Manage)`
                  : 'Connect Google Sheets for live 2-way cloud synchronization'
              }
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">
                Google Sheets
              </span>
              {googleSheetConnection ? (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              ) : (
                <Cloud className="w-3 h-3 text-slate-400" />
              )}
            </button>

            <button
              id="btn-export-excel"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg border border-emerald-600 font-medium transition-colors shadow-2xs"
              title="Export all sheets to multi-tab Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              id="btn-import-excel"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-2 rounded-lg border border-slate-300 transition-colors shadow-2xs"
              title="Import data from Excel / CSV"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              id="btn-print-sheet"
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors shadow-2xs"
              title="Print Current Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-clear-all-data"
              onClick={() => {
                if (currentRole !== 'admin') {
                  onOpenRoleModal('Admin authorization required to clear or reset sheet records');
                } else {
                  onResetData();
                }
              }}
              className={`p-2 rounded-lg border transition-colors shadow-2xs ${
                currentRole === 'admin'
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 bg-white border-slate-300'
                  : 'text-slate-400 bg-slate-100 border-slate-200 opacity-70 hover:opacity-100 hover:border-amber-400 cursor-pointer'
              }`}
              title={
                currentRole === 'admin'
                  ? 'Clear All Sheet Records (Start fresh)'
                  : 'Admin Role Required: Clear All Records'
              }
            >
              {currentRole === 'admin' ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
