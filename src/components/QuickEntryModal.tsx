import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Layers, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { ItemMaster, PurchaseRecord, IssueRecord, StockBalanceItem } from '../types';
import { formatItemCode } from '../utils/storage';

interface QuickEntryModalProps {
  type: 'purchase' | 'issue' | 'item' | null;
  items: ItemMaster[];
  stockBalances: StockBalanceItem[];
  onClose: () => void;
  onAddPurchase: (record: Omit<PurchaseRecord, 'id' | 'createdAt'>) => void;
  onAddIssue: (record: Omit<IssueRecord, 'id' | 'createdAt'>) => void;
  onAddItem: (item: Omit<ItemMaster, 'id' | 'createdAt'>) => void;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  type,
  items,
  stockBalances,
  onClose,
  onAddPurchase,
  onAddIssue,
  onAddItem,
}) => {
  if (!type) return null;

  // Active form type inside modal (can switch tabs)
  const [modalType, setModalType] = useState<'purchase' | 'issue' | 'item'>(type);
  useEffect(() => {
    if (type) setModalType(type);
  }, [type]);

  // Common Fields
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [billNo, setBillNo] = useState('');
  const [partyName, setPartyName] = useState(''); // Purchase from OR Issue to
  const [itemCodeInput, setItemCodeInput] = useState('');
  const [itemName, setItemName] = useState('');
  const [millName, setMillName] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [remarks, setRemarks] = useState('');
  const [openingStock, setOpeningStock] = useState('0');
  const [minAlert, setMinAlert] = useState('50');
  const [error, setError] = useState<string | null>(null);

  // Map for fast item code lookup
  const itemLookupMap = useMemo(() => {
    const map = new Map<string, ItemMaster>();
    items.forEach(it => {
      map.set(it.itemCode.trim().toUpperCase(), it);
    });
    return map;
  }, [items]);

  // Balance lookup
  const balanceMap = useMemo(() => {
    const map = new Map<string, StockBalanceItem>();
    stockBalances.forEach(b => map.set(b.itemCode.trim().toUpperCase(), b));
    return map;
  }, [stockBalances]);

  // Generated Item Code for Item Master tab
  const generatedItemMasterCode = useMemo(() => {
    return formatItemCode(itemName, millName);
  }, [itemName, millName]);

  // Handle Item Code Change with Auto-Lookup
  const handleItemCodeChange = (val: string) => {
    const raw = val.trim().toUpperCase();
    setItemCodeInput(val);

    if (itemLookupMap.has(raw)) {
      const match = itemLookupMap.get(raw)!;
      setItemName(match.itemName);
      setMillName(match.millName);
      setUnit(match.unit || 'Kg');
    } else if (raw.includes('-')) {
      const parts = raw.split('-');
      setItemName(parts[0].trim());
      setMillName(parts.slice(1).join('-').trim());
    } else {
      setItemName(raw);
      setMillName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (modalType === 'item') {
      const cleanItem = itemName.trim().toUpperCase();
      const cleanMill = millName.trim().toUpperCase();
      if (!cleanItem || !cleanMill) {
        setError('Please provide both Item Name and Mill Name.');
        return;
      }
      const code = `${cleanItem}-${cleanMill}`;
      if (items.some(i => i.itemCode.trim().toUpperCase() === code)) {
        setError(`Item code "${code}" already exists in Master.`);
        return;
      }

      onAddItem({
        itemName: cleanItem,
        millName: cleanMill,
        itemCode: code,
        unit: unit || 'Kg',
        openingStock: parseFloat(openingStock) || 0,
        minStockAlert: parseFloat(minAlert) || 50,
        remarks: remarks.trim(),
      });
      onClose();
      return;
    }

    // Purchase or Issue
    const parsedWeight = parseFloat(weight);
    if (!billNo.trim()) {
      setError('Please enter Bill / Invoice No.');
      return;
    }
    if (!partyName.trim()) {
      setError('Please enter Party Name.');
      return;
    }
    if (!itemCodeInput.trim()) {
      setError('Please select or enter Item Code.');
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError('Please enter a valid weight.');
      return;
    }

    const finalCode = itemCodeInput.trim().toUpperCase();
    const finalItem = (itemName.trim() || finalCode.split('-')[0] || finalCode).toUpperCase();
    const finalMill = (millName.trim() || (finalCode.includes('-') ? finalCode.split('-').slice(1).join('-') : 'GENERAL')).toUpperCase();
    const cleanParty = partyName.trim().toUpperCase();

    if (modalType === 'purchase') {
      onAddPurchase({
        date,
        billNo: billNo.trim().toUpperCase(),
        partyName: cleanParty,
        purchaseFrom: cleanParty,
        itemCode: finalCode,
        itemName: finalItem,
        millName: finalMill,
        weight: parsedWeight,
        unit,
        remarks: remarks.trim(),
      });
    } else {
      // Issue
      onAddIssue({
        date,
        billNo: billNo.trim().toUpperCase(),
        partyName: cleanParty,
        issueTo: cleanParty,
        itemCode: finalCode,
        itemName: finalItem,
        millName: finalMill,
        weight: parsedWeight,
        unit,
        remarks: remarks.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Quick Record Entry</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Type Selector Tabs */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 grid grid-cols-3 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setModalType('purchase'); setError(null); }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              modalType === 'purchase'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Purchase</span>
          </button>

          <button
            type="button"
            onClick={() => { setModalType('issue'); setError(null); }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              modalType === 'issue'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Issue</span>
          </button>

          <button
            type="button"
            onClick={() => { setModalType('item'); setError(null); }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              modalType === 'item'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Item</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {modalType === 'item' ? (
            /* ITEM MASTER FORM */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value.toUpperCase())}
                    placeholder="e.g. 30S"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mill Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={millName}
                    onChange={(e) => setMillName(e.target.value.toUpperCase())}
                    placeholder="e.g. BHILOSA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Generated Item Code (Combination)
                </label>
                <input
                  type="text"
                  readOnly
                  value={generatedItemMasterCode || 'ITEM-MILL'}
                  className="w-full px-3 py-2 text-xs bg-purple-50 border border-purple-200 text-purple-900 font-mono font-bold rounded-lg cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Lbs">Lbs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Stock (Wt)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Description
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional item details..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </>
          ) : (
            /* PURCHASE OR ISSUE FORM */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bill No. / Invoice <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value.toUpperCase())}
                    placeholder={modalType === 'purchase' ? 'e.g. PUR/101' : 'e.g. ISS/501'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value.toUpperCase())}
                  placeholder="Enter Party / Supplier / Customer / Unit Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="quick-item-code-list"
                  value={itemCodeInput}
                  onChange={(e) => handleItemCodeChange(e.target.value)}
                  placeholder="Select or enter e.g. 30S-BHILOSA"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-mono font-semibold"
                  required
                />
                <datalist id="quick-item-code-list">
                  {items.map(it => (
                    <option key={it.id} value={it.itemCode}>
                      {it.itemName} ({it.millName})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Auto-filled Item Name & Mill Name preview */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Item Name (Auto)</span>
                  <span className="font-semibold text-slate-800">{itemName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Mill Name (Auto)</span>
                  <span className="font-semibold text-slate-800">{millName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weight (Kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Notes..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors ${
                modalType === 'purchase'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : modalType === 'issue'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {modalType === 'purchase' ? 'Save Purchase' : modalType === 'issue' ? 'Save Issue' : 'Create Item'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
