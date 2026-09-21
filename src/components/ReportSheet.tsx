import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Boxes, 
  Layers, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Download,
  Filter
} from 'lucide-react';
import { StockBalanceItem } from '../types';

interface ReportSheetProps {
  stockBalances: StockBalanceItem[];
  onViewLedger: (itemCode: string) => void;
  onExportExcel: () => void;
}

export const ReportSheet: React.FC<ReportSheetProps> = ({
  stockBalances,
  onViewLedger,
  onExportExcel,
}) => {
  const [search, setSearch] = useState('');
  const [millFilter, setMillFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Distinct mills
  const distinctMills = useMemo(() => {
    const set = new Set<string>();
    stockBalances.forEach(b => {
      if (b.millName && b.millName !== '-') set.add(b.millName.trim());
    });
    return Array.from(set).sort();
  }, [stockBalances]);

  // Filtered items
  const filteredBalances = useMemo(() => {
    return stockBalances.filter(item => {
      const matchSearch =
        item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
        item.itemName.toLowerCase().includes(search.toLowerCase()) ||
        item.millName.toLowerCase().includes(search.toLowerCase());

      const matchMill = millFilter === 'ALL' || item.millName.toUpperCase() === millFilter.toUpperCase();

      let matchStatus = true;
      if (statusFilter === 'LOW') {
        matchStatus = item.status === 'Low Stock' || item.status === 'Negative';
      } else if (statusFilter === 'NEGATIVE') {
        matchStatus = item.status === 'Negative';
      } else if (statusFilter === 'POSITIVE') {
        matchStatus = item.balanceWeight > 0;
      }

      return matchSearch && matchMill && matchStatus;
    });
  }, [stockBalances, search, millFilter, statusFilter]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalOpening = 0;
    let totalPurchase = 0;
    let totalIssue = 0;
    let totalBalance = 0;
    let lowStockCount = 0;
    let negativeCount = 0;

    stockBalances.forEach(b => {
      totalOpening += b.openingStock;
      totalPurchase += b.totalPurchaseWeight;
      totalIssue += b.totalIssueWeight;
      totalBalance += b.balanceWeight;
      if (b.status === 'Low Stock') lowStockCount++;
      if (b.status === 'Negative') negativeCount++;
    });

    return {
      totalOpening,
      totalPurchase,
      totalIssue,
      totalBalance,
      lowStockCount,
      negativeCount,
      itemCount: stockBalances.length,
    };
  }, [stockBalances]);

  return (
    <div className="space-y-6">
      
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Current Stock Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Balance Stock</span>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {overallTotals.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-sans font-normal text-slate-500 ml-1">Kg</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">{stockBalances.length} distinct item types</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total Purchase */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Inward Purchased</span>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1">
              {overallTotals.totalPurchase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-sans font-normal text-slate-500 ml-1">Kg</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-700 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cumulative purchases</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Total Issue */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Outward Issued</span>
            <div className="text-2xl font-mono font-bold text-amber-700 mt-1">
              {overallTotals.totalIssue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-sans font-normal text-slate-500 ml-1">Kg</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-700 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cumulative issues</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Alerts & Health</span>
            <div className="text-2xl font-mono font-bold text-slate-800 mt-1">
              {overallTotals.lowStockCount + overallTotals.negativeCount}
              <span className="text-xs font-sans font-normal text-slate-500 ml-1.5">require attention</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              {overallTotals.negativeCount > 0 && (
                <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                  {overallTotals.negativeCount} Over-issued
                </span>
              )}
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                {overallTotals.lowStockCount} Low Stock
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Stock Report Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-report"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Item Code, Name, Mill..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mill Filter */}
            <select
              id="filter-report-mill"
              value={millFilter}
              onChange={(e) => setMillFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Mills</option>
              {distinctMills.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="filter-report-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSITIVE">In Stock (&gt; 0)</option>
              <option value="LOW">Low Stock / Warning</option>
              <option value="NEGATIVE">Negative (Over-issued)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{filteredBalances.length}</strong> of {stockBalances.length} items
            </span>
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>

        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center text-slate-400">#</th>
                <th className="py-3 px-4 font-mono">Item Code</th>
                <th className="py-3 px-3">Item Name</th>
                <th className="py-3 px-3">Mill Name</th>
                <th className="py-3 px-2 text-center">Unit</th>
                <th className="py-3 px-3 text-right">Opening (Wt)</th>
                <th className="py-3 px-4 text-right text-emerald-800">Total Purchase (Wt)</th>
                <th className="py-3 px-4 text-right text-amber-900">Total Issue (Wt)</th>
                <th className="py-3 px-4 text-right bg-blue-50/50 font-mono text-blue-950 font-bold">
                  Balance Weight
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-20">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 text-xs sm:text-sm">
                    No items found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item, index) => {
                  let statusBadge = (
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      In Stock
                    </span>
                  );

                  if (item.status === 'Negative') {
                    statusBadge = (
                      <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Negative
                      </span>
                    );
                  } else if (item.status === 'Low Stock') {
                    statusBadge = (
                      <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Low Stock
                      </span>
                    );
                  } else if (item.status === 'Out of Stock') {
                    statusBadge = (
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full font-medium">
                        Nil Stock
                      </span>
                    );
                  }

                  return (
                    <tr 
                      key={item.itemCode}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onViewLedger(item.itemCode)}
                    >
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2 py-0.5 rounded border border-slate-200 text-xs transition-colors">
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-800">
                          {item.millName}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-500 text-xs">
                        {item.unit || 'Kg'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.openingStock.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                        {item.totalPurchaseWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-amber-800">
                        {item.totalIssueWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm bg-blue-50/40 ${
                        item.balanceWeight > 0 ? 'text-slate-900' : item.balanceWeight < 0 ? 'text-rose-700' : 'text-slate-400'
                      }`}>
                        {item.balanceWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onViewLedger(item.itemCode)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Open Item Ledger"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredBalances.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-right font-sans uppercase tracking-wider text-xs">
                    Grand Total:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {overallTotals.totalOpening.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800 text-xs">
                    {overallTotals.totalPurchase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-900 text-xs">
                    {overallTotals.totalIssue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-900 text-sm bg-blue-100/60 font-extrabold">
                    {overallTotals.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>

    </div>
  );
};
