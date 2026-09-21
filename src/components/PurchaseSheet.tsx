import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  ArrowDownLeft, 
  Sparkles, 
  AlertCircle, 
  Check, 
  X, 
  Calendar,
  History,
  Info,
  Building2,
  Lock
} from 'lucide-react';
import { ItemMaster, PurchaseRecord, PartyMaster, UserRole } from '../types';
import { DeleteConfirmModal, DeleteModalState } from './DeleteConfirmModal';

interface PurchaseSheetProps {
  purchases: PurchaseRecord[];
  items: ItemMaster[];
  parties?: PartyMaster[];
  onAddPurchase: (record: Omit<PurchaseRecord, 'id' | 'createdAt'>) => void;
  onUpdatePurchase: (id: string, record: Partial<PurchaseRecord>) => void;
  onDeletePurchase: (id: string) => void;
  onViewLedger: (itemCode: string) => void;
  onQuickAddItemToMaster?: (itemName: string, millName: string) => void;
  userRole: UserRole;
  onRequireAdmin?: (reason?: string) => void;
}

export const PurchaseSheet: React.FC<PurchaseSheetProps> = ({
  purchases,
  items,
  parties = [],
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onViewLedger,
  userRole,
  onRequireAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [partyFilter, setPartyFilter] = useState('ALL');

  // New Purchase Form State
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [billNo, setBillNo] = useState('');
  const [partyName, setPartyName] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [millName, setMillName] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState | null>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBillNo, setEditBillNo] = useState('');
  const [editPartyName, setEditPartyName] = useState('');
  const [editItemCode, setEditItemCode] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editMillName, setEditMillName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editUnit, setEditUnit] = useState('Kg');
  const [editRemarks, setEditRemarks] = useState('');

  // Map for fast item code lookup
  const itemLookupMap = useMemo(() => {
    const map = new Map<string, ItemMaster>();
    items.forEach(it => {
      map.set(it.itemCode.trim().toUpperCase(), it);
    });
    return map;
  }, [items]);

  // Sorted party list strictly from Party Master
  const partyMasterList = useMemo(() => {
    return [...parties].sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [parties]);

  // Sorted item list strictly from Item Master
  const itemMasterList = useMemo(() => {
    return [...items].sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  }, [items]);

  // Handle Item Code Change with Automatic Auto-Lookup from Item Master
  const handleItemCodeChange = (codeValue: string) => {
    const rawCode = codeValue.trim().toUpperCase();
    setSelectedItemCode(codeValue);

    if (itemLookupMap.has(rawCode)) {
      const match = itemLookupMap.get(rawCode)!;
      setItemName(match.itemName);
      setMillName(match.millName);
      setUnit(match.unit || 'Kg');
    } else {
      setItemName('');
      setMillName('');
    }
  };

  // Edit handler with Auto-lookup from Item Master
  const handleEditItemCodeChange = (codeValue: string) => {
    const rawCode = codeValue.trim().toUpperCase();
    setEditItemCode(codeValue);

    if (itemLookupMap.has(rawCode)) {
      const match = itemLookupMap.get(rawCode)!;
      setEditItemName(match.itemName);
      setEditMillName(match.millName);
      setEditUnit(match.unit || 'Kg');
    } else {
      setEditItemName('');
      setEditMillName('');
    }
  };

  // Distinct parties for filtering historical table
  const distinctParties = useMemo(() => {
    const set = new Set<string>();
    parties.forEach(p => {
      if (p.partyName?.trim()) set.add(p.partyName.trim());
    });
    purchases.forEach(p => {
      const name = (p.partyName || p.purchaseFrom || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [purchases, parties]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const currentParty = (p.partyName || p.purchaseFrom || '').toLowerCase();
      const matchSearch =
        p.billNo.toLowerCase().includes(search.toLowerCase()) ||
        currentParty.includes(search.toLowerCase()) ||
        p.itemCode.toLowerCase().includes(search.toLowerCase()) ||
        p.itemName.toLowerCase().includes(search.toLowerCase()) ||
        p.millName.toLowerCase().includes(search.toLowerCase()) ||
        (p.remarks && p.remarks.toLowerCase().includes(search.toLowerCase()));

      const matchDateStart = !dateFilterStart || p.date >= dateFilterStart;
      const matchDateEnd = !dateFilterEnd || p.date <= dateFilterEnd;
      const matchParty = partyFilter === 'ALL' || currentParty === partyFilter.toLowerCase();

      return matchSearch && matchDateStart && matchDateEnd && matchParty;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, search, dateFilterStart, dateFilterEnd, partyFilter]);

  // Total weight for current view
  const totalViewWeight = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (Number(p.weight) || 0), 0);
  }, [filteredPurchases]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedWeight = parseFloat(weight);
    if (!billNo.trim()) {
      setFormError('Please enter Bill / Invoice No.');
      return;
    }
    if (!partyName.trim()) {
      setFormError('Please select a Party Name from Party Master.');
      return;
    }

    const cleanParty = partyName.trim();
    const matchedParty = parties.find(
      p => p.partyName.trim().toUpperCase() === cleanParty.toUpperCase()
    );
    if (!matchedParty) {
      setFormError(`Party "${cleanParty}" is not found in Party Master. Only parties from Party Master are allowed.`);
      return;
    }

    if (!selectedItemCode.trim()) {
      setFormError('Please select an Item Code from Item Master.');
      return;
    }

    const rawCode = selectedItemCode.trim().toUpperCase();
    const matchedItem = itemLookupMap.get(rawCode);
    if (!matchedItem) {
      setFormError(`Item Code "${selectedItemCode}" is not found in Item Master. Only items from Item Master are allowed.`);
      return;
    }

    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setFormError('Please enter a valid positive weight.');
      return;
    }

    onAddPurchase({
      date: date || new Date().toISOString().slice(0, 10),
      billNo: billNo.trim().toUpperCase(),
      partyName: matchedParty.partyName,
      purchaseFrom: matchedParty.partyName,
      itemCode: matchedItem.itemCode,
      itemName: matchedItem.itemName,
      millName: matchedItem.millName,
      weight: parsedWeight,
      unit: matchedItem.unit || unit || 'Kg',
      remarks: remarks.trim(),
    });

    // Reset entry form except date and party for quick repeated entries
    setBillNo('');
    setSelectedItemCode('');
    setItemName('');
    setMillName('');
    setWeight('');
    setRemarks('');
    setFormError(null);
  };

  const startEdit = (p: PurchaseRecord) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing purchase records.');
      return;
    }
    setEditingId(p.id);
    setEditDate(p.date);
    setEditBillNo(p.billNo);
    setEditPartyName(p.partyName || p.purchaseFrom || '');
    setEditItemCode(p.itemCode);
    setEditItemName(p.itemName);
    setEditMillName(p.millName);
    setEditWeight(String(p.weight));
    setEditUnit(p.unit || 'Kg');
    setEditRemarks(p.remarks || '');
  };

  const saveEdit = (id: string) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing purchase records.');
      return;
    }
    const parsedWeight = parseFloat(editWeight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    const cleanParty = editPartyName.trim();
    const matchedParty = parties.find(
      p => p.partyName.trim().toUpperCase() === cleanParty.toUpperCase()
    );
    if (!matchedParty) {
      alert(`Party "${cleanParty}" is not found in Party Master. Only registered parties from Party Master are allowed.`);
      return;
    }

    const rawCode = editItemCode.trim().toUpperCase();
    const matchedItem = itemLookupMap.get(rawCode);
    if (!matchedItem) {
      alert(`Item Code "${editItemCode}" is not found in Item Master. Only registered items from Item Master are allowed.`);
      return;
    }

    onUpdatePurchase(id, {
      date: editDate,
      billNo: editBillNo.trim().toUpperCase(),
      partyName: matchedParty.partyName,
      purchaseFrom: matchedParty.partyName,
      itemCode: matchedItem.itemCode,
      itemName: matchedItem.itemName,
      millName: matchedItem.millName,
      weight: parsedWeight,
      unit: editUnit || matchedItem.unit || 'Kg',
      remarks: editRemarks.trim(),
    });

    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                Stock Purchase Sheet (Inward)
                <span className="text-xs font-normal bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  Auto-Populates Item & Mill Name
                </span>
              </h2>
              <p className="text-xs text-emerald-800/80 mt-1 max-w-2xl">
                Record daily incoming stock purchases by entering Date, Bill No, Party Name, Item Code, and Weight. The <strong>Item Name</strong> and <strong>Mill Name</strong> will automatically fill upon selecting or entering the Item Code.
              </p>
            </div>
          </div>

          <div className="bg-white/90 border border-emerald-200 rounded-lg px-4 py-2.5 shadow-xs shrink-0 flex items-center gap-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Total Purchase Weight
              </span>
              <span className="text-xl font-mono font-bold text-emerald-800">
                {totalViewWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg
              </span>
            </div>
            <div className="border-l border-emerald-200 pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Entries
              </span>
              <span className="text-xl font-mono font-bold text-slate-700">
                {purchases.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* New Purchase Entry Row Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-800">Add Daily Purchase Entry</h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Fast auto-lookup from Party & Item Masters
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5">
          {formError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Grid matching user's required columns: Date, Bill No, Party Name, Item Code, Item Name, Mill Name, Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            
            {/* 1. Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                1. Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-pur-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
            </div>

            {/* 2. Bill No. */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                2. Bill No. <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-pur-billno"
                type="text"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value.toUpperCase())}
                placeholder="e.g. PUR/101"
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase font-mono"
                required
              />
            </div>

            {/* 3. Party Name (Strict Party Master) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>3. Party Name <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-blue-600 font-medium">Party Master ({parties.length})</span>
              </label>
              <select
                id="select-pur-party"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase font-medium bg-white text-slate-900"
                required
              >
                <option value="">-- Select Party from Party Master --</option>
                {partyMasterList.map(p => (
                  <option key={p.id} value={p.partyName}>
                    {p.partyName} {p.partyType ? `[${p.partyType}]` : ''} {p.city ? `(${p.city})` : ''}
                  </option>
                ))}
              </select>
              {parties.length === 0 && (
                <p className="text-[10px] text-rose-600 mt-1">
                  No parties in Party Master. Please add parties in the Party Master tab first.
                </p>
              )}
            </div>

            {/* 4. Item Code (Strict Item Master) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>4. Item Code <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-emerald-700 font-medium">Item Master ({items.length})</span>
              </label>
              <select
                id="select-pur-itemcode"
                value={selectedItemCode}
                onChange={(e) => handleItemCodeChange(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-emerald-400 bg-emerald-50/40 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono font-semibold text-emerald-950"
                required
              >
                <option value="">-- Select Item Code from Item Master --</option>
                {itemMasterList.map(it => (
                  <option key={it.id} value={it.itemCode}>
                    {it.itemCode} — {it.itemName} ({it.millName})
                  </option>
                ))}
              </select>
              {items.length === 0 && (
                <p className="text-[10px] text-rose-600 mt-1">
                  No items in Item Master. Please add items in Item Master tab first.
                </p>
              )}
            </div>

            {/* 5. Item Name (Auto-filled) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>5. Item Name</span>
                <span className="text-[10px] text-emerald-600 font-normal">Auto-filled</span>
              </label>
              <div className="relative">
                <input
                  id="input-pur-itemname"
                  type="text"
                  value={itemName}
                  readOnly
                  placeholder="Auto-filled from Item Master"
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 font-semibold text-slate-800 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* 6. Mill Name (Auto-filled) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>6. Mill Name</span>
                <span className="text-[10px] text-emerald-600 font-normal">Auto-filled</span>
              </label>
              <div className="relative">
                <input
                  id="input-pur-millname"
                  type="text"
                  value={millName}
                  readOnly
                  placeholder="Auto-filled from Item Master"
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 font-semibold text-slate-800 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* 7. Weight */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                7. Weight (Kg) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-pur-weight"
                type="number"
                step="0.01"
                min="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                required
              />
            </div>

          </div>

          {/* Bottom row with Remarks & Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="w-full sm:w-1/2">
              <input
                id="input-pur-remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks / Vehicle No. / Lot No. (Optional)"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                id="btn-submit-purchase"
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Record Purchase</span>
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Purchase Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-purchases"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bill, party, item..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
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

            {/* Party Filter */}
            <select
              id="filter-purchase-party"
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            >
              <option value="ALL">All Parties</option>
              {distinctParties.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={dateFilterStart}
                onChange={(e) => setDateFilterStart(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg outline-none"
              />
              <span className="text-slate-400 text-[11px]">To:</span>
              <input
                type="date"
                value={dateFilterEnd}
                onChange={(e) => setDateFilterEnd(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg outline-none"
              />
              {(dateFilterStart || dateFilterEnd) && (
                <button
                  onClick={() => { setDateFilterStart(''); setDateFilterEnd(''); }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredPurchases.length}</strong> of {purchases.length} entries
          </div>

        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center text-slate-400">#</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 font-mono">Bill No.</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 font-mono">Item Code</th>
                <th className="py-3 px-3">Item Name</th>
                <th className="py-3 px-3">Mill Name</th>
                <th className="py-3 px-4 text-right">Weight (Kg)</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs sm:text-sm">
                    No purchase records found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur, index) => {
                  const isEditing = editingId === pur.id;
                  const currentParty = pur.partyName || pur.purchaseFrom || '';

                  if (isEditing) {
                    return (
                      <tr key={pur.id} className="bg-emerald-50/40 border-y border-emerald-200">
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-emerald-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editBillNo}
                            onChange={(e) => setEditBillNo(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-emerald-300 rounded font-mono uppercase"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <select
                            value={editPartyName}
                            onChange={(e) => setEditPartyName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-emerald-300 rounded font-medium uppercase bg-white"
                          >
                            <option value="">-- Select Party --</option>
                            {partyMasterList.map(p => (
                              <option key={p.id} value={p.partyName}>{p.partyName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <select
                            value={editItemCode}
                            onChange={(e) => handleEditItemCodeChange(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-emerald-300 rounded font-mono uppercase font-bold text-emerald-800 bg-white"
                          >
                            <option value="">-- Select Item --</option>
                            {itemMasterList.map(it => (
                              <option key={it.id} value={it.itemCode}>{it.itemCode}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editItemName}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded uppercase font-semibold bg-slate-100 cursor-not-allowed text-slate-700"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editMillName}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded uppercase font-semibold bg-slate-100 cursor-not-allowed text-slate-700"
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-24 px-2 py-1 text-xs border border-emerald-300 rounded text-right font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-emerald-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(pur.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={pur.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {pur.date}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        {pur.billNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {currentParty}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {pur.itemCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {pur.itemName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-800">
                          {pur.millName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {Number(pur.weight).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs truncate max-w-xs" title={pur.remarks}>
                        {pur.remarks || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewLedger(pur.itemCode)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="View Stock Ledger"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {userRole === 'admin' ? (
                            <>
                              <button
                                onClick={() => startEdit(pur)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit Purchase"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteModalState({
                                    isOpen: true,
                                    type: 'purchase',
                                    id: pur.id,
                                    title: 'Delete Purchase Bill Record',
                                    subtitle: `Bill No: ${pur.billNo}`,
                                    details: [
                                      { label: 'Date', value: pur.date },
                                      { label: 'Bill No.', value: pur.billNo },
                                      { label: 'Party Name', value: currentParty },
                                      { label: 'Item Code', value: pur.itemCode },
                                      { label: 'Item Name', value: pur.itemName },
                                      { label: 'Mill Name', value: pur.millName },
                                      { label: 'Weight', value: `${Number(pur.weight).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${pur.unit || 'Kg'}` },
                                    ],
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Purchase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can modify existing purchase records.')}
                                className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Edit Purchase"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can delete purchase records.')}
                                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Delete Purchase"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredPurchases.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={7} className="py-3 px-4 text-right font-sans uppercase tracking-wider text-xs">
                    Total Purchase Weight:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                    {totalViewWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kg
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>

      {/* In-app Delete Confirmation Modal */}
      <DeleteConfirmModal
        state={deleteModalState}
        onClose={() => setDeleteModalState(null)}
        onConfirm={() => {
          if (deleteModalState) {
            onDeletePurchase(deleteModalState.id);
          }
        }}
      />

    </div>
  );
};
