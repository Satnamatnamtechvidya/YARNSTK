import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  Filter, 
  History, 
  FileSpreadsheet, 
  Printer, 
  Boxes, 
  Layers,
  ArrowUpDown,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PartyMaster, PurchaseRecord, IssueRecord, PartySummaryItem } from '../types';
import { calculatePartySummaries } from '../utils/storage';

interface PartyReportSheetProps {
  parties: PartyMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  onViewPartyLedger: (partyName: string) => void;
  onNavigateToPartyMaster: () => void;
}

export const PartyReportSheet: React.FC<PartyReportSheetProps> = ({
  parties = [],
  purchases = [],
  issues = [],
  onViewPartyLedger,
  onNavigateToPartyMaster,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'PURCHASE_ONLY' | 'ISSUE_ONLY' | 'BOTH' | 'ACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'purchase' | 'issue' | 'balance' | 'txCount'>('purchase');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute all party summaries
  const partySummaries = useMemo(() => {
    return calculatePartySummaries(parties, purchases, issues);
  }, [parties, purchases, issues]);

  // Overall aggregate totals
  const overallTotals = useMemo(() => {
    let totalPurchased = 0;
    let totalIssued = 0;
    let activePartyCount = 0;
    let suppliersCount = 0;
    let customersCount = 0;

    partySummaries.forEach(p => {
      totalPurchased += p.totalPurchasedWeight;
      totalIssued += p.totalIssuedWeight;
      if (p.totalTransactions > 0) activePartyCount++;
      if (p.totalPurchasedWeight > 0) suppliersCount++;
      if (p.totalIssuedWeight > 0) customersCount++;
    });

    return {
      totalPurchased: Math.round(totalPurchased * 100) / 100,
      totalIssued: Math.round(totalIssued * 100) / 100,
      netDifference: Math.round((totalPurchased - totalIssued) * 100) / 100,
      totalParties: partySummaries.length,
      activePartyCount,
      suppliersCount,
      customersCount,
    };
  }, [partySummaries]);

  // Filtered & Sorted party summaries
  const filteredSummaries = useMemo(() => {
    return partySummaries.filter(p => {
      const matchSearch =
        p.partyName.toLowerCase().includes(search.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
        (p.phone && p.phone.includes(search));

      const matchType = typeFilter === 'ALL' || p.partyType === typeFilter;

      let matchActivity = true;
      if (activityFilter === 'ACTIVE') {
        matchActivity = p.totalTransactions > 0;
      } else if (activityFilter === 'PURCHASE_ONLY') {
        matchActivity = p.totalPurchasedWeight > 0 && p.totalIssuedWeight === 0;
      } else if (activityFilter === 'ISSUE_ONLY') {
        matchActivity = p.totalIssuedWeight > 0 && p.totalPurchasedWeight === 0;
      } else if (activityFilter === 'BOTH') {
        matchActivity = p.totalPurchasedWeight > 0 && p.totalIssuedWeight > 0;
      }

      return matchSearch && matchType && matchActivity;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.partyName.localeCompare(b.partyName);
      } else if (sortBy === 'purchase') {
        comparison = a.totalPurchasedWeight - b.totalPurchasedWeight;
      } else if (sortBy === 'issue') {
        comparison = a.totalIssuedWeight - b.totalIssuedWeight;
      } else if (sortBy === 'balance') {
        comparison = a.netBalanceWeight - b.netBalanceWeight;
      } else if (sortBy === 'txCount') {
        comparison = a.totalTransactions - b.totalTransactions;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [partySummaries, search, typeFilter, activityFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'purchase' | 'issue' | 'balance' | 'txCount') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredSummaries.map((p, idx) => ({
      'S.No': idx + 1,
      'Party Name': p.partyName,
      'Party Type': p.partyType || 'Supplier',
      'City': p.city || '',
      'Contact Person': p.contactPerson || '',
      'Phone': p.phone || '',
      'Total Purchased Weight (Kg)': p.totalPurchasedWeight,
      'Total Issued Weight (Kg)': p.totalIssuedWeight,
      'Net Balance Weight (Kg)': p.netBalanceWeight,
      'Purchase Bills Count': p.purchaseCount,
      'Issue Challans Count': p.issueCount,
      'Total Transactions': p.totalTransactions,
      'Last Active Date': p.lastTransactionDate || '-',
      'Last Transaction Type': p.lastTransactionType || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Party Material Report');
    XLSX.writeFile(wb, `Party_Wise_Material_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Party-Wise Material Report
                </h2>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded font-mono font-bold border border-blue-400/30">
                  Purchased & Issued
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Consolidated party statement showing all material purchased from suppliers and material issued to customers, weavers, or job workers with net balances and direct ledger drill-down.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
              title="Export report to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report (.xlsx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onNavigateToPartyMaster}
              className="flex items-center gap-1.5 bg-blue-700/80 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-lg border border-blue-500/30 font-medium transition-colors cursor-pointer"
              title="Go to Party Master"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Party Master</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800 text-xs">
          
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Material In (Purchase)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              +{overallTotals.totalPurchased.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              From {overallTotals.suppliersCount} supplier parties
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Material Out (Issue)</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-1">
              -{overallTotals.totalIssued.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              To {overallTotals.customersCount} customer / weaver parties
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span>Net Material Balance</span>
              <Boxes className="w-4 h-4 text-blue-400" />
            </div>
            <div className={`text-lg font-mono font-bold mt-1 ${overallTotals.netDifference >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
              {overallTotals.netDifference.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {overallTotals.netDifference >= 0 ? 'Inward Net Surplus' : 'Outward Net Excess'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span>Parties With Activity</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 mt-1">
              {overallTotals.activePartyCount} <span className="text-xs font-normal text-slate-400">/ {overallTotals.totalParties}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Active accounts with transactions
            </span>
          </div>

        </div>
      </div>

      {/* Controls Bar: Search, Filters, Sorting */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name, city, contact..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none text-xs focus:border-blue-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none text-xs"
            >
              <option value="ALL">All Types</option>
              <option value="Supplier">Suppliers</option>
              <option value="Customer">Customers</option>
              <option value="Weaver">Weavers</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Activity:</span>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none text-xs"
            >
              <option value="ALL">All Parties ({partySummaries.length})</option>
              <option value="ACTIVE">With Transactions Only</option>
              <option value="PURCHASE_ONLY">Only Purchases (Suppliers)</option>
              <option value="ISSUE_ONLY">Only Issues (Receivers)</option>
              <option value="BOTH">Both Purchases & Issues</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none text-xs"
            >
              <option value="purchase">Highest Purchase (In)</option>
              <option value="issue">Highest Issue (Out)</option>
              <option value="balance">Net Balance</option>
              <option value="txCount">Transaction Count</option>
              <option value="name">Party Name (A-Z)</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title={`Sorting: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Party-Wise Report Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 w-12 text-center">Sr.</th>
                <th 
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Party Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">City / Location</th>
                <th 
                  className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleSort('purchase')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Purchased (Inward)</span>
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleSort('issue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Issued (Outward)</span>
                    <ArrowUpRight className="w-3 h-3 text-amber-600" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleSort('balance')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Balance (In - Out)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                  onClick={() => toggleSort('txCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Bills / Slips</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Last Transaction</th>
                <th className="py-3 px-3.5 text-right">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No party records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting search or filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((p, idx) => {
                  return (
                    <tr 
                      key={p.partyName}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => onViewPartyLedger(p.partyName)}
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      
                      {/* Party Name */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {p.partyName}
                          </span>
                        </div>
                        {p.contactPerson && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Contact: {p.contactPerson} {p.phone ? `(${p.phone})` : ''}
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          p.partyType === 'Supplier' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : p.partyType === 'Customer'
                            ? 'bg-blue-100 text-blue-800'
                            : p.partyType === 'Weaver'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {p.partyType || 'Supplier'}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                        {p.city ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{p.city}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Purchased (Inward) */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {p.totalPurchasedWeight > 0 ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{p.totalPurchasedWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Issued (Outward) */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {p.totalIssuedWeight > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            -{p.totalIssuedWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Net Balance */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded ${
                          p.netBalanceWeight > 0 
                            ? 'text-blue-800 bg-blue-50 border border-blue-200' 
                            : p.netBalanceWeight < 0
                            ? 'text-rose-700 bg-rose-50 border border-rose-200'
                            : 'text-slate-600 bg-slate-100'
                        }`}>
                          {p.netBalanceWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                        </span>
                      </td>

                      {/* Counts */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="font-mono text-slate-700 font-medium">
                          {p.purchaseCount} in / {p.issueCount} out
                        </span>
                      </td>

                      {/* Last Transaction */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {p.lastTransactionDate ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{p.lastTransactionDate}</span>
                            {p.lastTransactionType === 'PURCHASE' ? (
                              <span className="text-[10px] text-emerald-600 font-bold">(PUR)</span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold">(ISS)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onViewPartyLedger(p.partyName)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          title="View detailed statement & ledger"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            
            {/* Table Footer Totals */}
            {filteredSummaries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                  <td colSpan={4} className="py-3 px-3.5 text-right uppercase tracking-wider text-[11px] text-slate-600">
                    Filtered Totals ({filteredSummaries.length} Parties):
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-700">
                    +{filteredSummaries.reduce((a, b) => a + b.totalPurchasedWeight, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-amber-700">
                    -{filteredSummaries.reduce((a, b) => a + b.totalIssuedWeight, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-blue-800">
                    {filteredSummaries.reduce((a, b) => a + b.netBalanceWeight, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-700">
                    {filteredSummaries.reduce((a, b) => a + b.totalTransactions, 0)} tx
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredSummaries.length}</span> of <span className="font-semibold text-slate-800">{partySummaries.length}</span> parties
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Party Material Intelligence Active</span>
          </div>
        </div>
      </div>

    </div>
  );
};
