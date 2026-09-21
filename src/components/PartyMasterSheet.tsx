import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Building2, 
  Sparkles, 
  AlertCircle, 
  Check, 
  X,
  History,
  Phone,
  MapPin,
  FileSpreadsheet,
  Download,
  Users,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PartyMaster, PartyType, PurchaseRecord, IssueRecord, UserRole } from '../types';
import { DeleteConfirmModal, DeleteModalState } from './DeleteConfirmModal';

interface PartyMasterSheetProps {
  parties: PartyMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  onAddParty: (party: Omit<PartyMaster, 'id' | 'createdAt'>) => void;
  onUpdateParty: (id: string, party: Partial<PartyMaster>) => void;
  onDeleteParty: (id: string) => void;
  onViewPartyLedger: (partyName: string) => void;
  userRole: UserRole;
  onRequireAdmin?: (reason?: string) => void;
}

export const PartyMasterSheet: React.FC<PartyMasterSheetProps> = ({
  parties = [],
  purchases = [],
  issues = [],
  onAddParty,
  onUpdateParty,
  onDeleteParty,
  onViewPartyLedger,
  userRole,
  onRequireAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // New Party Form State
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('Supplier');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyType, setEditPartyType] = useState<PartyType>('Supplier');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState | null>(null);

  // Transaction count lookup for each party
  const transactionStats = useMemo(() => {
    const map = new Map<string, { purCount: number; issCount: number; purWeight: number; issWeight: number }>();
    
    purchases.forEach(p => {
      const name = (p.partyName || p.purchaseFrom || '').trim().toUpperCase();
      if (!name) return;
      const curr = map.get(name) || { purCount: 0, issCount: 0, purWeight: 0, issWeight: 0 };
      curr.purCount += 1;
      curr.purWeight += Number(p.weight) || 0;
      map.set(name, curr);
    });

    issues.forEach(i => {
      const name = (i.partyName || i.issueTo || '').trim().toUpperCase();
      if (!name) return;
      const curr = map.get(name) || { purCount: 0, issCount: 0, purWeight: 0, issWeight: 0 };
      curr.issCount += 1;
      curr.issWeight += Number(i.weight) || 0;
      map.set(name, curr);
    });

    return map;
  }, [purchases, issues]);

  // Overall counts by type
  const typeCounts = useMemo(() => {
    let suppliers = 0;
    let customers = 0;
    let weavers = 0;
    let both = 0;

    parties.forEach(p => {
      if (p.partyType === 'Supplier') suppliers++;
      else if (p.partyType === 'Customer') customers++;
      else if (p.partyType === 'Weaver') weavers++;
      else if (p.partyType === 'Both') both++;
    });

    return {
      total: parties.length,
      suppliers,
      customers,
      weavers,
      both,
    };
  }, [parties]);

  // Filtered parties
  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      const matchSearch =
        p.partyName.toLowerCase().includes(search.toLowerCase()) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
        (p.phone && p.phone.includes(search)) ||
        (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase())) ||
        (p.remarks && p.remarks.toLowerCase().includes(search.toLowerCase()));

      const matchType = typeFilter === 'ALL' || p.partyType === typeFilter;

      return matchSearch && matchType;
    }).sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [parties, search, typeFilter]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = partyName.trim().toUpperCase();
    if (!cleanName) {
      setFormError('Please enter Party Name');
      return;
    }

    const existing = parties.some(p => p.partyName.trim().toUpperCase() === cleanName);
    if (existing) {
      setFormError(`Party "${cleanName}" already exists in the master.`);
      return;
    }

    onAddParty({
      partyName: cleanName,
      partyType,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      city: city.trim().toUpperCase(),
      address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      remarks: remarks.trim(),
    });

    // Reset form
    setPartyName('');
    setContactPerson('');
    setPhone('');
    setCity('');
    setAddress('');
    setGstin('');
    setRemarks('');
    setFormError(null);
  };

  const startEdit = (p: PartyMaster) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing Party Master records.');
      return;
    }
    setEditingId(p.id);
    setEditPartyName(p.partyName);
    setEditPartyType(p.partyType || 'Supplier');
    setEditContactPerson(p.contactPerson || '');
    setEditPhone(p.phone || '');
    setEditCity(p.city || '');
    setEditAddress(p.address || '');
    setEditGstin(p.gstin || '');
    setEditRemarks(p.remarks || '');
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    if (userRole !== 'admin') {
      onRequireAdmin?.('Only Administrator can modify existing Party Master records.');
      return;
    }
    const cleanName = editPartyName.trim().toUpperCase();
    if (!cleanName) {
      setEditError('Party Name cannot be empty.');
      return;
    }

    const duplicate = parties.some(p => p.id !== id && p.partyName.trim().toUpperCase() === cleanName);
    if (duplicate) {
      setEditError(`Another party with name "${cleanName}" already exists.`);
      return;
    }

    onUpdateParty(id, {
      partyName: cleanName,
      partyType: editPartyType,
      contactPerson: editContactPerson.trim(),
      phone: editPhone.trim(),
      city: editCity.trim().toUpperCase(),
      address: editAddress.trim(),
      gstin: editGstin.trim().toUpperCase(),
      remarks: editRemarks.trim(),
    });

    setEditingId(null);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = parties.map((p, idx) => {
      const stats = transactionStats.get(p.partyName.trim().toUpperCase()) || { purCount: 0, issCount: 0, purWeight: 0, issWeight: 0 };
      return {
        'S.No': idx + 1,
        'Party Name': p.partyName,
        'Party Type': p.partyType || 'Supplier',
        'Contact Person': p.contactPerson || '',
        'Phone / Mobile': p.phone || '',
        'City': p.city || '',
        'GSTIN': p.gstin || '',
        'Address': p.address || '',
        'Total Purchased Weight (Kg)': stats.purWeight,
        'Total Issued Weight (Kg)': stats.issWeight,
        'Remarks': p.remarks || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Party Master');
    XLSX.writeFile(wb, `Party_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Info */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Party Master Directory
                </h2>
                <span className="bg-blue-600/10 text-blue-700 text-xs px-2 py-0.5 rounded font-mono font-bold">
                  {parties.length} Parties
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Maintain all Suppliers, Customers, Weaving Units, and Job Workers in one central master. Used for auto-completing Party Name in Purchase and Issue sheets and generating party-wise material statements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-2 rounded-lg border border-slate-300 font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Master (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-blue-200/60 text-xs">
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
            <span className="text-[11px] text-slate-500 block">Total Parties</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{typeCounts.total}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
            <span className="text-[11px] text-emerald-600 block font-medium">Suppliers</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">{typeCounts.suppliers}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
            <span className="text-[11px] text-blue-600 block font-medium">Customers</span>
            <span className="font-mono font-bold text-blue-700 text-sm">{typeCounts.customers}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
            <span className="text-[11px] text-purple-600 block font-medium">Weavers / Loom</span>
            <span className="font-mono font-bold text-purple-700 text-sm">{typeCounts.weavers}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
            <span className="text-[11px] text-amber-600 block font-medium">Both / Job Workers</span>
            <span className="font-mono font-bold text-amber-700 text-sm">{typeCounts.both}</span>
          </div>
        </div>
      </div>

      {/* New Party Creation Form */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Add New Party to Master
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Auto-suggests across Purchase & Issue</span>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Party Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Party Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="party-name-input"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value.toUpperCase())}
                placeholder="e.g. VARDHMAN TEXTILES"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Party Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Party Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="party-type-select"
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as PartyType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
              >
                <option value="Supplier">Supplier (Purchases)</option>
                <option value="Customer">Customer (Issues / Sales)</option>
                <option value="Weaver">Weaver / Loom (Issues)</option>
                <option value="Job Worker">Job Worker / Processor</option>
                <option value="Both">Both (Purchase & Issue)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / Mobile
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value.toUpperCase())}
                placeholder="e.g. SURAT / AHMEDABAD / LUDHIANA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 24AAAAA0000A1Z5"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none uppercase font-mono"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional party notes or terms..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              id="btn-save-party"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save to Party Master</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name, city, phone, GSTIN..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none text-xs focus:border-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium whitespace-nowrap">Filter Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none text-xs"
          >
            <option value="ALL">All Types ({parties.length})</option>
            <option value="Supplier">Suppliers ({typeCounts.suppliers})</option>
            <option value="Customer">Customers ({typeCounts.customers})</option>
            <option value="Weaver">Weavers ({typeCounts.weavers})</option>
            <option value="Both">Both ({typeCounts.both})</option>
          </select>
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">Sr.</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-center">Activity</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No parties found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Add a new party using the form above or enter a Party Name in Purchase / Issue sheets.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredParties.map((p, idx) => {
                  const isEditing = editingId === p.id;
                  const stats = transactionStats.get(p.partyName.trim().toUpperCase()) || { purCount: 0, issCount: 0, purWeight: 0, issWeight: 0 };
                  const totalTx = stats.purCount + stats.issCount;

                  if (isEditing) {
                    return (
                      <tr key={p.id} className="bg-blue-50/50">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editPartyName}
                            onChange={(e) => setEditPartyName(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded outline-none font-semibold uppercase"
                          />
                          {editError && <span className="text-[10px] text-rose-500 block mt-1">{editError}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={editPartyType}
                            onChange={(e) => setEditPartyType(e.target.value as PartyType)}
                            className="px-2 py-1 text-xs border border-blue-400 rounded bg-white outline-none"
                          >
                            <option value="Supplier">Supplier</option>
                            <option value="Customer">Customer</option>
                            <option value="Weaver">Weaver</option>
                            <option value="Job Worker">Job Worker</option>
                            <option value="Both">Both</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded uppercase"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editContactPerson}
                            onChange={(e) => setEditContactPerson(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded font-mono"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editGstin}
                            onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded uppercase font-mono"
                          />
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 text-xs">-</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded"
                          />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(p.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.partyName}</span>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-slate-700">
                        {p.city ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{p.city}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{p.contactPerson || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.phone || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{p.gstin || '-'}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onViewPartyLedger(p.partyName)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-md font-medium text-[11px] transition-colors cursor-pointer"
                          title="View all purchase and issue transactions for this party"
                        >
                          <History className="w-3 h-3 text-blue-600" />
                          <span>{totalTx} tx ({stats.purWeight > 0 ? `+${Math.round(stats.purWeight)}` : ''}{stats.issWeight > 0 ? ` -${Math.round(stats.issWeight)}` : ''} Kg)</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={p.remarks}>
                        {p.remarks || '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewPartyLedger(p.partyName)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="View Material Statement"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {userRole === 'admin' ? (
                            <>
                              <button
                                onClick={() => startEdit(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit Party Details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModalState({
                                  isOpen: true,
                                  id: p.id,
                                  title: `Delete Party "${p.partyName}"`,
                                  description: 'Are you sure you want to remove this party from Party Master? Existing purchase and issue records will retain their historical party name.',
                                })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Party"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can modify existing Party Master records.')}
                                className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Edit Party"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onRequireAdmin?.('Only Administrator can delete parties from master.')}
                                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Admin Role Required to Delete Party"
                              >
                                <Lock className="w-4 h-4" />
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

        {/* Table Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredParties.length}</span> of <span className="font-semibold text-slate-800">{parties.length}</span> parties
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Party Master Active</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalState && (
        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen}
          title={deleteModalState.title}
          description={deleteModalState.description}
          onConfirm={() => {
            onDeleteParty(deleteModalState.id);
            setDeleteModalState(null);
          }}
          onCancel={() => setDeleteModalState(null)}
        />
      )}

    </div>
  );
};
