import React, { useMemo, useState } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Printer, 
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Filter,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PartyMaster, PurchaseRecord, IssueRecord } from '../types';
import { getPartyLedger } from '../utils/storage';

interface PartyLedgerModalProps {
  partyName: string | null;
  parties: PartyMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  onClose: () => void;
}

export const PartyLedgerModal: React.FC<PartyLedgerModalProps> = ({
  partyName,
  parties,
  purchases,
  issues,
  onClose,
}) => {
  if (!partyName) return null;

  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'ISSUE'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const targetParty = useMemo(() => {
    return parties.find(p => p.partyName.trim().toUpperCase() === partyName.trim().toUpperCase());
  }, [parties, partyName]);

  const allMovements = useMemo(() => {
    return getPartyLedger(partyName, purchases, issues);
  }, [partyName, purchases, issues]);

  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => {
      const matchType = filterType === 'ALL' || m.type === filterType;
      const matchStart = !dateStart || m.date >= dateStart;
      const matchEnd = !dateEnd || m.date <= dateEnd;
      return matchType && matchStart && matchEnd;
    });
  }, [allMovements, filterType, dateStart, dateEnd]);

  const summary = useMemo(() => {
    let totalPurchased = 0;
    let totalIssued = 0;
    allMovements.forEach(m => {
      totalPurchased += m.inWeight;
      totalIssued += m.outWeight;
    });
    const netBalance = Math.round((totalPurchased - totalIssued) * 100) / 100;
    return {
      totalPurchased: Math.round(totalPurchased * 100) / 100,
      totalIssued: Math.round(totalIssued * 100) / 100,
      netBalance,
      totalCount: allMovements.length,
      purCount: allMovements.filter(m => m.type === 'PURCHASE').length,
      issCount: allMovements.filter(m => m.type === 'ISSUE').length,
    };
  }, [allMovements]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportStatementExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredMovements.map((m, idx) => ({
      'S.No': idx + 1,
      'Date': m.date,
      'Bill No. / Challan': m.billNo,
      'Transaction Type': m.type === 'PURCHASE' ? 'PURCHASE (IN)' : 'ISSUE (OUT)',
      'Item Code': m.itemCode,
      'Item Name': m.itemName,
      'Mill Name': m.millName,
      'Inward Weight (Kg)': m.inWeight > 0 ? m.inWeight : '',
      'Outward Weight (Kg)': m.outWeight > 0 ? m.outWeight : '',
      'Running Balance (Kg)': m.runningBalance,
      'Remarks': m.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 13 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `${partyName.slice(0, 25)} Ledger`);
    XLSX.writeFile(wb, `Party_Statement_${partyName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">
                  Party Material Statement & Ledger
                </h3>
                {targetParty?.partyType && (
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                    {targetParty.partyType}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-emerald-400 mt-0.5">
                {partyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStatementExcel}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 font-medium transition-colors cursor-pointer"
              title="Export statement to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
              title="Print party statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Party Meta Details Bar if available */}
        {(targetParty?.contactPerson || targetParty?.phone || targetParty?.city || targetParty?.gstin) && (
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {targetParty.contactPerson && (
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Contact:</span>
                <span className="font-semibold text-slate-800">{targetParty.contactPerson}</span>
              </span>
            )}
            {targetParty.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="font-mono text-slate-700">{targetParty.phone}</span>
              </span>
            )}
            {targetParty.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-slate-700">{targetParty.city}</span>
              </span>
            )}
            {targetParty.gstin && (
              <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800">
                GST: {targetParty.gstin}
              </span>
            )}
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">Total Purchased (In)</span>
            <span className="text-base font-mono font-bold text-emerald-600">
              +{summary.totalPurchased.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{summary.purCount} bills</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">Total Issued (Out)</span>
            <span className="text-base font-mono font-bold text-amber-600">
              -{summary.totalIssued.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{summary.issCount} challans</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">Net Balance (In - Out)</span>
            <span className={`text-base font-mono font-bold ${summary.netBalance >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
              {summary.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">Kg</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {summary.netBalance > 0 ? 'Net Inward Surplus' : summary.netBalance < 0 ? 'Net Outward Excess' : 'Balanced'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium block">Total Transactions</span>
            <span className="text-base font-mono font-bold text-slate-800">
              {summary.totalCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Lifetime activity</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">Filter Type:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All ({allMovements.length})
              </button>
              <button
                onClick={() => setFilterType('PURCHASE')}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'PURCHASE' ? 'bg-emerald-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Purchases ({summary.purCount})
              </button>
              <button
                onClick={() => setFilterType('ISSUE')}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'ISSUE' ? 'bg-amber-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Issues ({summary.issCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Date:</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
              placeholder="From"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded text-xs outline-none"
              placeholder="To"
            />
            {(dateStart || dateEnd) && (
              <button
                onClick={() => { setDateStart(''); setDateEnd(''); }}
                className="text-xs text-rose-500 hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Movements Table */}
        <div className="flex-1 overflow-auto p-4">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No transactions found for this party</p>
              <p className="text-xs text-slate-400 mt-1">
                Enter purchases or issues using this Party Name to generate records.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill / Challan</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Item & Mill</th>
                  <th className="py-2.5 px-3 text-right">Inward (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Outward (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Net (Kg)</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {m.billNo}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {m.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          PURCHASE (IN)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <ArrowUpRight className="w-3 h-3 text-amber-600" />
                          ISSUE (OUT)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-purple-700 whitespace-nowrap">
                      {m.itemCode}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-medium">{m.itemName}</span>
                      {m.millName && m.millName !== '-' && (
                        <span className="text-slate-400 text-[11px] ml-1">({m.millName})</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                      {m.inWeight > 0 ? `+${m.inWeight.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-600">
                      {m.outWeight > 0 ? `-${m.outWeight.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${m.runningBalance >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                      {m.runningBalance.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={m.remarks}>
                      {m.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredMovements.length}</span> records for <span className="font-semibold text-slate-800">{partyName}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Statement
          </button>
        </div>

      </div>
    </div>
  );
};
