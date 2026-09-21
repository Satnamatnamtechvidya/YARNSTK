import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  Check, 
  X,
  History,
  Tag,
  Lock
} from 'lucide-react';
import { ItemMaster, StockBalanceItem, UserRole } from '../types';
import { formatItemCode } from '../utils/storage';
import { DeleteConfirmModal, DeleteModalState } from './DeleteConfirmModal';

interface ItemMasterSheetProps {
  items: ItemMaster[];
  stockBalances: StockBalanceItem[];
  onAddItem: (item: Omit<ItemMaster, 'id' | 'createdAt'>) => void;
  onUpdateItem: (id: string, item: Partial<ItemMaster>) => void;
  onDeleteItem: (id: string) => void;
  onViewLedger: (itemCode: string) => void;
  userRole: UserRole;
  onRequireAdmin?: (reason?: string) => void;
}

export const ItemMasterSheet: React.FC<ItemMasterSheetProps> = ({
  items,
  stockBalances,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onViewLedger,
  userRole,
  onRequireAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [millFilter, setMillFilter] = useState('ALL');
  
  // New Item Form State
  const [itemName, setItemName] = useState('');
  const [millName, setMillName] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [openingStock, setOpeningStock] = useState<string>('0');
  const [minAlert, setMinAlert] = useState<string>('50');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editMillName, setEditMillName] = useState('');
  const [editUnit, setEditUnit] = useState('Kg');
  const [editOpeningStock, setEditOpeningStock] = useState('0');
  const [editMinAlert, setEditMinAlert] = useState('50');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState | null>(null);

  // Live preview of generated item code
  const generatedItemCode = useMemo(() => {
    return formatItemCode(itemName, millName);
  }, [itemName, millName]);

  const editGeneratedItemCode = useMemo(() => {
    return formatItemCode(editItemName, editMillName);
  }, [editItemName, editMillName]);

  // Distinct mills for filter
  const distinctMills = useMemo(() => {
    const mills = new Set<string>();
    items.forEach(it => {
      if (it.millName) mills.add(it.millName);
    });
    return Array.from(mills).sort();
  }, [items]);

  // Balance lookup map
  const balanceMap = useMemo(() => {
    const map = new Map<string, StockBalanceItem>();
    stockBalances.forEach(b => map.set(b.itemCode, b));
    return map;
  }, [stockBalances]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = 
        it.itemCode.toLowerCase().includes(search.toLowerCase()) ||
        it.itemName.toLowerCase().includes(search.toLowerCase()) ||
        it.millName.toLowerCase().includes(search.toLowerCase()) ||
        (it.remarks && it.remarks.toLowerCase().includes(search.toLowerCase()));

      const matchMill = millFilter === 'ALL' || it.millName.toUpperCase() === millFilter.toUpperCase();

      return matchSearch && matchMill;
    });
  }, [items, search, millFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanItem = itemName.trim().toUpperCase();
    const cleanMill = millName.trim().toUpperCase();

    if (!cleanItem) {
      setFormError('Please enter Item Name (e.g. 30S, 40S, Cotton).');
      return;
    }
    if (!cleanMill) {
      setFormError('Please enter Mill Name (e.g. BHILOSA, VARDHMAN).');
      return;
    }

    const code = `${cleanItem}-${cleanMill}`;

    // Check if code already exists
    const exists = items.some(it => it.itemCode.trim().toUpperCase() === code);
    if (exists) {
      setFormError(`Item code "${code}" already exists in the Item Master.`);
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

    // Reset form
    setItemName('');
    setMillName('');
    setOpeningStock('0');
    setMinAlert('50');
    setRemarks('');
    setFormError(null);
  };

  const startEdit = (item: ItemMaster) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing Item Master records.');
      return;
    }
    setEditingId(item.id);
    setEditItemName(item.itemName);
    setEditMillName(item.millName);
    setEditUnit(item.unit || 'Kg');
    setEditOpeningStock(String(item.openingStock || 0));
    setEditMinAlert(String(item.minStockAlert ?? 50));
    setEditRemarks(item.remarks || '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing Item Master records.');
      return;
    }
    const cleanItem = editItemName.trim().toUpperCase();
    const cleanMill = editMillName.trim().toUpperCase();
    if (!cleanItem || !cleanMill) {
      setEditError('Item name and mill name are required.');
      return;
    }

    const newCode = `${cleanItem}-${cleanMill}`;
    // Check if other item has this code
    const duplicate = items.some(it => it.id !== id && it.itemCode.trim().toUpperCase() === newCode);
    if (duplicate) {
      setEditError(`Another item already has the code "${newCode}".`);
      return;
    }

    onUpdateItem(id, {
      itemName: cleanItem,
      millName: cleanMill,
      itemCode: newCode,
      unit: editUnit,
      openingStock: parseFloat(editOpeningStock) || 0,
      minStockAlert: parseFloat(editMinAlert) || 50,
      remarks: editRemarks.trim(),
    });

    setEditingId(null);
    setEditError(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner explaining the item code rule */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                Item Master & Code Generator
                <span className="text-xs font-normal bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                  Formula: ItemName-MillName
                </span>
              </h2>
              <p className="text-xs text-purple-800/80 mt-1 max-w-2xl">
                Every item is identified by combining its <strong>Item Name</strong> (e.g. <code>30S</code>) and <strong>Mill Name</strong> (e.g. <code>BHILOSA</code>) into a single unique code: <span className="font-mono font-semibold bg-white/80 px-1.5 py-0.5 rounded text-purple-900 border border-purple-300">30S-BHILOSA</span>. Entering this code in Purchase & Issue sheets will automatically pull the Item Name and Mill Name.
              </p>
            </div>
          </div>

          <div className="bg-white/90 border border-purple-200 rounded-lg px-4 py-2.5 shadow-xs shrink-0">
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
              Master Item Count
            </span>
            <span className="text-xl font-mono font-bold text-slate-800">
              {items.length} <span className="text-xs font-normal text-slate-500">registered</span>
            </span>
          </div>
        </div>
      </div>

      {/* Item Creation Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-800">Create New Item Record</h3>
          </div>
          {generatedItemCode && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Generated Item Code:</span>
              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                {generatedItemCode}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleCreateSubmit} className="p-5">
          {formError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Item Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-item-name"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value.toUpperCase())}
                placeholder="e.g. 30S, 40S, 20S"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase font-mono"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Yarn count, type or spec</span>
            </div>

            {/* 2. Mill Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mill Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-mill-name"
                type="text"
                value={millName}
                onChange={(e) => setMillName(e.target.value.toUpperCase())}
                placeholder="e.g. BHILOSA, VARDHMAN"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase font-mono"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Spinning / processing mill</span>
            </div>

            {/* 3. Resulting Item Code (Auto generated) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item Code (Auto Calculated)
              </label>
              <div className="relative">
                <input
                  id="input-item-code-preview"
                  type="text"
                  readOnly
                  value={generatedItemCode || 'ITEM-MILL'}
                  className={`w-full px-3 py-2 text-sm border rounded-lg font-mono font-bold outline-none cursor-not-allowed ${
                    generatedItemCode 
                      ? 'bg-purple-50/70 border-purple-300 text-purple-900' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                />
                <Sparkles className="w-4 h-4 text-purple-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-purple-600 font-medium mt-1 block">
                Auto generated as combination
              </span>
            </div>

            {/* 4. Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unit of Weight
              </label>
              <select
                id="select-item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
              >
                <option value="Kg">Kg (Kilograms)</option>
                <option value="Bags">Bags</option>
                <option value="Tons">Tons</option>
                <option value="Lbs">Lbs (Pounds)</option>
                <option value="Boxes">Boxes</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Default measurement</span>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-100">
            {/* Opening Stock */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening Stock Weight ({unit})
              </label>
              <input
                id="input-opening-stock"
                type="number"
                step="0.01"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono"
              />
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Alert Level ({unit})
              </label>
              <input
                id="input-min-alert"
                type="number"
                step="1"
                min="0"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono"
              />
            </div>

            {/* Remarks / Spec */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Description / Remarks
              </label>
              <input
                id="input-item-remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. 100% cotton combed, lot A"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
            <button
              id="btn-submit-new-item"
              type="submit"
              disabled={!itemName.trim() || !millName.trim()}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                itemName.trim() && millName.trim()
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Item to Master</span>
            </button>
          </div>

        </form>
      </div>

      {/* Item Master Table & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-items"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, item, mill..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
              id="filter-mill-items"
              value={millFilter}
              onChange={(e) => setMillFilter(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="ALL">All Mills ({distinctMills.length})</option>
              {distinctMills.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of {items.length} items
          </div>
        </div>

        {/* Excel-like Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center text-slate-400">#</th>
                <th className="py-3 px-4 font-mono">Item Code</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Mill Name</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3 text-right">Opening (Wt)</th>
                <th className="py-3 px-3 text-right">Current Balance</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs sm:text-sm">
                    No items found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isEditing = editingId === item.id;
                  const balanceInfo = balanceMap.get(item.itemCode);
                  const currentBal = balanceInfo ? balanceInfo.balanceWeight : item.openingStock || 0;

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-purple-50/40 border-y border-purple-200">
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2 px-4">
                          <span className="font-mono font-bold text-purple-800 bg-purple-100/70 px-2 py-1 rounded">
                            {editGeneratedItemCode}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-purple-300 rounded uppercase font-mono"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editMillName}
                            onChange={(e) => setEditMillName(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-purple-300 rounded uppercase font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="px-2 py-1 text-xs border border-purple-300 rounded"
                          >
                            <option value="Kg">Kg</option>
                            <option value="Bags">Bags</option>
                            <option value="Tons">Tons</option>
                            <option value="Lbs">Lbs</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editOpeningStock}
                            onChange={(e) => setEditOpeningStock(e.target.value)}
                            className="w-20 px-2 py-1 text-xs border border-purple-300 rounded text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-500">
                          -
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-purple-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
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
                      key={item.id} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 text-xs">
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-800">
                          {item.millName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {item.unit || 'Kg'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {(item.openingStock || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span className={`font-semibold ${
                          currentBal > 0 ? 'text-emerald-700' : currentBal < 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}>
                          {currentBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs truncate max-w-xs" title={item.remarks}>
                        {item.remarks || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewLedger(item.itemCode)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="View Stock Movement Ledger"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {userRole === 'admin' ? (
                            <>
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteModalState({
                                    isOpen: true,
                                    type: 'item',
                                    id: item.id,
                                    title: 'Delete Item from Master',
                                    subtitle: `Item Code: ${item.itemCode}`,
                                    details: [
                                      { label: 'Item Name', value: item.itemName },
                                      { label: 'Mill Name', value: item.millName },
                                      { label: 'Item Code', value: item.itemCode },
                                      { label: 'Current Balance', value: `${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${item.unit || 'Kg'}` },
                                    ],
                                    warningMessage: currentBal !== 0 
                                      ? `This item currently has a stock balance of ${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${item.unit || 'Kg'}. Deleting the item master record will remove its definition.`
                                      : undefined,
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can modify existing Item Master records.')}
                                className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Edit Item"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can delete items from master.')}
                                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Delete Item"
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
          </table>
        </div>

      </div>

      {/* In-app Delete Confirmation Modal */}
      <DeleteConfirmModal
        state={deleteModalState}
        onClose={() => setDeleteModalState(null)}
        onConfirm={() => {
          if (deleteModalState) {
            onDeleteItem(deleteModalState.id);
          }
        }}
      />

    </div>
  );
};
