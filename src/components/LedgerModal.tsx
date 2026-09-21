import React, { useMemo } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Boxes, 
  Printer, 
  Calendar,
  Layers,
  History
} from 'lucide-react';
import { ItemMaster, PurchaseRecord, IssueRecord } from '../types';
import { getItemLedger } from '../utils/storage';

interface LedgerModalProps {
  itemCode: string | null;
  items: ItemMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  onClose: () => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  itemCode,
  items,
  purchases,
  issues,
  onClose,
}) => {
  if (!itemCode) return null;

  const targetItem = useMemo(() => {
    return items.find(it => it.itemCode.trim().toUpperCase() === itemCode.trim().toUpperCase());
  }, [items, itemCode]);

  const openingStock = targetItem?.openingStock || 0;

  const movements = useMemo(() => {
    return getItemLedger(itemCode, purchases, issues, openingStock);
  }, [itemCode, purchases, issues, openingStock]);

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    movements.forEach(m => {
      totalIn += m.inWeight;
      totalOut += m.outWeight;
    });
    const closing = openingStock + totalIn - totalOut;
    return {
      totalIn,
      totalOut,
      closing,
    };
  }, [movements, openingStock]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-bold">
                  {itemCode}
                </span>
                <h3 className="text-base font-semibold">
                  Item Stock Ledger & Movement
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Item: {targetItem?.itemName || itemCode.split('-')[0]} | Mill: {targetItem?.millName || itemCode.split('-')[1] || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Print Ledger"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Opening Stock</span>
            <span className="font-mono font-bold text-slate-800 text-base">
              {openingStock.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-emerald-100">
            <span className="text-emerald-600 block text-[11px] font-medium">+ Total Purchased</span>
            <span className="font-mono font-bold text-emerald-700 text-base">
              {summary.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-amber-100">
            <span className="text-amber-600 block text-[11px] font-medium">- Total Issued</span>
            <span className="font-mono font-bold text-amber-800 text-base">
              {summary.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50/40">
            <span className="text-blue-700 block text-[11px] font-bold">= Current Balance</span>
            <span className="font-mono font-bold text-blue-900 text-base">
              {summary.closing.toLocaleString('en-US', { minimumFractionDigits: 2 })} Kg
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-y-auto p-4 flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 font-mono">Bill No.</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-4">Party (From / To)</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Inward (Kg)</th>
                <th className="py-2.5 px-3 text-right text-amber-800">Outward (Kg)</th>
                <th className="py-2.5 px-4 text-right font-bold text-slate-900">Balance (Kg)</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Opening Stock Row */}
              <tr className="bg-slate-50/70 font-medium">
                <td className="py-2 px-3 text-center text-slate-400">-</td>
                <td className="py-2 px-3 text-slate-500 font-mono">-</td>
                <td className="py-2 px-3 text-slate-500 font-mono">-</td>
                <td className="py-2 px-3">
                  <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-mono">
                    OPENING
                  </span>
                </td>
                <td className="py-2 px-4 text-slate-600 italic">Initial balance brought forward</td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">
                  {openingStock.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 px-3 text-slate-400">-</td>
              </tr>

              {movements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No purchase or issue movements recorded yet for this item.
                  </td>
                </tr>
              ) : (
                movements.map((entry, idx) => {
                  const isPurchase = entry.type === 'PURCHASE';

                  return (
                    <tr key={entry.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{entry.date}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{entry.billNo}</td>
                      <td className="py-2.5 px-3">
                        {isPurchase ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3 h-3" />
                            Purchase
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            Issue
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{entry.party}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {entry.inWeight > 0 ? entry.inWeight.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-800">
                        {entry.outWeight > 0 ? entry.outWeight.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                        entry.runningBalance >= 0 ? 'text-slate-900' : 'text-rose-700'
                      }`}>
                        {entry.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">{entry.remarks || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total Movements: <strong>{movements.length}</strong> transactions
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
