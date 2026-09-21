import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { 
  ItemMaster, 
  PurchaseRecord, 
  IssueRecord, 
  ActiveSheetTab, 
  StockBalanceItem,
  GoogleSheetConnection,
  PartyMaster,
  UserRole
} from './types';
import { 
  getStoredItems, 
  saveStoredItems, 
  getStoredPurchases, 
  saveStoredPurchases, 
  getStoredIssues, 
  saveStoredIssues, 
  getStoredParties, 
  saveStoredParties, 
  resetToDefaultData, 
  calculateStockBalances,
  calculatePartySummaries,
  formatItemCode,
  getStoredGoogleConnection,
  saveStoredGoogleConnection
} from './utils/storage';
import { exportWorkbookToExcel, parseExcelImport } from './utils/excel';
import { initAuth } from './utils/googleAuth';
import { 
  getStoredRole, 
  saveStoredRole,
  getStoredOperatorName,
  saveStoredOperatorName,
  isSessionLoggedIn,
  setSessionLoggedIn,
  clearSessionLoggedIn,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS 
} from './utils/authRoles';
import { LoginScreen } from './components/LoginScreen';

import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { ReportSheet } from './components/ReportSheet';
import { PurchaseSheet } from './components/PurchaseSheet';
import { IssueSheet } from './components/IssueSheet';
import { ItemMasterSheet } from './components/ItemMasterSheet';
import { PartyMasterSheet } from './components/PartyMasterSheet';
import { PartyReportSheet } from './components/PartyReportSheet';
import { LedgerModal } from './components/LedgerModal';
import { PartyLedgerModal } from './components/PartyLedgerModal';
import { QuickEntryModal } from './components/QuickEntryModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SupabaseModal } from './components/SupabaseModal';
import { RoleModal } from './components/RoleModal';
import {
  isSupabaseConfigured,
  fetchAllFromSupabase,
  supabaseSaveItem,
  supabaseDeleteItem,
  supabaseSaveParty,
  supabaseDeleteParty,
  supabaseSavePurchase,
  supabaseDeletePurchase,
  supabaseSaveIssue,
  supabaseDeleteIssue,
  subscribeToSupabaseChanges
} from './utils/supabase';
import {
  fetchCloudStockData,
  syncAllToCloud,
  cloudSavePurchase,
  cloudDeletePurchase,
  cloudSaveIssue,
  cloudDeleteIssue,
  cloudSaveItem,
  cloudDeleteItem,
  cloudSaveParty,
  cloudDeleteParty,
  cloudResetAll,
  startCloudPolling
} from './utils/cloudApi';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<ItemMaster[]>(() => getStoredItems());
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => getStoredPurchases());
  const [issues, setIssues] = useState<IssueRecord[]>(() => getStoredIssues());
  const [parties, setParties] = useState<PartyMaster[]>(() => getStoredParties());
  
  // Google Workspace state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleSheetConnection | null>(() => getStoredGoogleConnection());
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Supabase Database state
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(() => isSupabaseConfigured());

  // Cloud Database synchronization state
  const [isCloudLive, setIsCloudLive] = useState<boolean>(true);
  const lastCloudModifiedRef = useRef<number>(Date.now());

  const [activeTab, setActiveTab] = useState<ActiveSheetTab>('report');
  const [ledgerItemCode, setLedgerItemCode] = useState<string | null>(null);
  const [ledgerPartyName, setLedgerPartyName] = useState<string | null>(null);
  const [quickEntryType, setQuickEntryType] = useState<'purchase' | 'issue' | 'item' | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // User Role & Permissions state (Admin vs User)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => getStoredRole());
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalReason, setRoleModalReason] = useState<string | null>(null);

  // Session Authentication & Idle Tracking state
  // Respects session on page refresh (F5) so user is not repeatedly logged out
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => isSessionLoggedIn());
  const [logoutReason, setLogoutReason] = useState<'idle' | 'manual' | null>(null);
  const [operatorName, setOperatorName] = useState<string>(() => getStoredOperatorName() || 'Satnam');

  // Inactivity tracking refs
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef<boolean>(false);

  const handleRequireAdmin = (reason?: string) => {
    setRoleModalReason(reason || 'Administrator authorization is required for this action.');
    setIsRoleModalOpen(true);
  };
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLogout = useCallback((reason: 'idle' | 'manual' = 'manual') => {
    setIsLoggedIn(false);
    setLogoutReason(reason);
    clearSessionLoggedIn();
    if (reason === 'idle') {
      showToast('Session expired after 10 minutes of inactivity.', 'error');
    } else {
      showToast('Logged out successfully.', 'success');
    }
  }, []);

  const handleLogin = (role: UserRole, name?: string) => {
    setCurrentRole(role);
    saveStoredRole(role);
    if (name) {
      setOperatorName(name);
      saveStoredOperatorName(name);
    }
    setSessionLoggedIn(role, name);
    setIsLoggedIn(true);
    setLogoutReason(null);
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
  };

  // 10-minute Inactivity / Idle Auto-Logout Listener
  useEffect(() => {
    if (!isLoggedIn) return;

    lastActivityRef.current = Date.now();
    warnedRef.current = false;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (warnedRef.current) {
        warnedRef.current = false;
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const intervalId = setInterval(() => {
      const idleDuration = Date.now() - lastActivityRef.current;
      if (idleDuration >= IDLE_TIMEOUT_MS) {
        handleLogout('idle');
      } else if (idleDuration >= IDLE_WARNING_MS && !warnedRef.current) {
        warnedRef.current = true;
        showToast('Warning: Idle for 9 minutes. You will be automatically logged out in 1 minute.');
      }
    }, 2000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(intervalId);
    };
  }, [isLoggedIn, handleLogout]);

  // Central Cloud Database Sync & Multi-Device Polling
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Cloud Sync
    fetchCloudStockData().then(async (cloudData) => {
      if (!isMounted) return;
      if (cloudData) {
        setIsCloudLive(true);
        lastCloudModifiedRef.current = cloudData.lastModified;

        const cloudHasRecords = 
          cloudData.items.length > 0 || 
          cloudData.parties.length > 0 || 
          cloudData.purchases.length > 0 || 
          cloudData.issues.length > 0;

        if (cloudHasRecords) {
          // Cloud has existing data -> use cloud records
          setItems(cloudData.items);
          setParties(cloudData.parties);
          setPurchases(cloudData.purchases);
          setIssues(cloudData.issues);
        } else {
          // Cloud is empty. If this device has local data, push it to cloud
          const currentItems = getStoredItems();
          const currentParties = getStoredParties();
          const currentPurchases = getStoredPurchases();
          const currentIssues = getStoredIssues();

          const localHasRecords = 
            currentItems.length > 0 || 
            currentParties.length > 0 || 
            currentPurchases.length > 0 || 
            currentIssues.length > 0;

          if (localHasRecords) {
            await syncAllToCloud({
              items: currentItems,
              parties: currentParties,
              purchases: currentPurchases,
              issues: currentIssues,
            });
          }
        }
      } else {
        setIsCloudLive(false);
      }
    });

    // 2. Poll every 4 seconds to sync entries made by team members on other systems
    const stopPolling = startCloudPolling(
      () => lastCloudModifiedRef.current,
      (updatedData) => {
        if (!isMounted) return;
        setIsCloudLive(true);
        lastCloudModifiedRef.current = updatedData.lastModified;
        setItems(updatedData.items);
        setParties(updatedData.parties);
        setPurchases(updatedData.purchases);
        setIssues(updatedData.issues);
        showToast('Live updated with changes from another system', 'success');
      },
      4000
    );

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, []);

  // Auto-sync with Supabase on startup if configured
  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    if (configured) {
      fetchAllFromSupabase().then((remoteData) => {
        if (remoteData) {
          let hasRecords = false;
          if (remoteData.items.length > 0) { setItems(remoteData.items); hasRecords = true; }
          if (remoteData.parties.length > 0) { setParties(remoteData.parties); hasRecords = true; }
          if (remoteData.purchases.length > 0) { setPurchases(remoteData.purchases); hasRecords = true; }
          if (remoteData.issues.length > 0) { setIssues(remoteData.issues); hasRecords = true; }
          if (hasRecords) {
            showToast('Synchronized with Supabase database', 'success');
          }
        }
      });

      // Subscribe to real-time changes from any client
      const unsubscribe = subscribeToSupabaseChanges(() => {
        fetchAllFromSupabase().then((remoteData) => {
          if (remoteData) {
            if (remoteData.items.length > 0) setItems(remoteData.items);
            if (remoteData.parties.length > 0) setParties(remoteData.parties);
            if (remoteData.purchases.length > 0) setPurchases(remoteData.purchases);
            if (remoteData.issues.length > 0) setIssues(remoteData.issues);
          }
        });
      });

      return () => unsubscribe();
    }
  }, []);

  // Google Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save Google Sheet connection
  useEffect(() => {
    saveStoredGoogleConnection(googleConnection);
  }, [googleConnection]);

  // Sync to localStorage
  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  useEffect(() => {
    saveStoredPurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    saveStoredIssues(issues);
  }, [issues]);

  useEffect(() => {
    saveStoredParties(parties);
  }, [parties]);

  // Live calculated stock balances
  const stockBalances = useMemo(() => {
    return calculateStockBalances(items, purchases, issues);
  }, [items, purchases, issues]);

  // Live calculated party-wise summaries
  const partySummaries = useMemo(() => {
    return calculatePartySummaries(parties, purchases, issues);
  }, [parties, purchases, issues]);

  // Total balance stock weight across all items
  const totalStockWeight = useMemo(() => {
    return stockBalances.reduce((acc, curr) => acc + curr.balanceWeight, 0);
  }, [stockBalances]);

  // ----------------------------------------------------
  // PARTY MASTER ACTIONS
  // ----------------------------------------------------
  const handleAddParty = (newParty: Omit<PartyMaster, 'id' | 'createdAt'>) => {
    const party: PartyMaster = {
      ...newParty,
      id: `party-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      partyName: newParty.partyName.trim().toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    setParties(prev => [party, ...prev]);
    lastCloudModifiedRef.current = Date.now();
    cloudSaveParty(party);
    supabaseSaveParty(party);
    showToast(`Added Party "${party.partyName}" to Party Master!`);
  };

  const handleUpdateParty = (id: string, updatedFields: Partial<PartyMaster>) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can modify existing Party Master records.');
      return;
    }
    setParties(prev => prev.map(p => {
      if (p.id === id) {
        const updated = {
          ...p,
          ...updatedFields,
          partyName: updatedFields.partyName ? updatedFields.partyName.trim().toUpperCase() : p.partyName,
        };
        lastCloudModifiedRef.current = Date.now();
        cloudSaveParty(updated);
        supabaseSaveParty(updated);
        return updated;
      }
      return p;
    }));
    showToast('Party updated successfully!');
  };

  const handleDeleteParty = (id: string) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can delete parties from master.');
      return;
    }
    setParties(prev => prev.filter(p => p.id !== id));
    lastCloudModifiedRef.current = Date.now();
    cloudDeleteParty(id);
    supabaseDeleteParty(id);
    showToast('Party removed from master.');
  };

  // ----------------------------------------------------
  // ITEM MASTER ACTIONS
  // ----------------------------------------------------
  const handleAddItem = (newItem: Omit<ItemMaster, 'id' | 'createdAt'>) => {
    const item: ItemMaster = {
      ...newItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [item, ...prev]);
    lastCloudModifiedRef.current = Date.now();
    cloudSaveItem(item);
    supabaseSaveItem(item);
    showToast(`Created Item "${item.itemCode}" in Item Master!`);
  };

  const handleUpdateItem = (id: string, updatedFields: Partial<ItemMaster>) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can modify existing Item Master records.');
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updatedFields };
        lastCloudModifiedRef.current = Date.now();
        cloudSaveItem(updated);
        supabaseSaveItem(updated);
        return updated;
      }
      return item;
    }));
    showToast('Item updated successfully!');
  };

  const handleDeleteItem = (id: string) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can delete items from master.');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    lastCloudModifiedRef.current = Date.now();
    cloudDeleteItem(id);
    supabaseDeleteItem(id);
    showToast('Item deleted from master.');
  };

  // ----------------------------------------------------
  // PURCHASE ACTIONS
  // ----------------------------------------------------
  const handleAddPurchase = (record: Omit<PurchaseRecord, 'id' | 'createdAt'>) => {
    const partyVal = (record.partyName || record.purchaseFrom || '').trim().toUpperCase();
    const newRecord: PurchaseRecord = {
      ...record,
      partyName: partyVal,
      purchaseFrom: partyVal,
      id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    // Auto-create item in master if not already present
    const cleanCode = record.itemCode.trim().toUpperCase();
    const itemExists = items.some(i => i.itemCode.trim().toUpperCase() === cleanCode);
    if (!itemExists) {
      const autoItem: ItemMaster = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemName: record.itemName,
        millName: record.millName,
        itemCode: cleanCode,
        unit: record.unit || 'Kg',
        openingStock: 0,
        minStockAlert: 50,
        createdAt: new Date().toISOString(),
      };
      setItems(prev => [autoItem, ...prev]);
      cloudSaveItem(autoItem);
      supabaseSaveItem(autoItem);
    }

    // Auto-create party in master if not already present
    if (partyVal && !parties.some(p => p.partyName.trim().toUpperCase() === partyVal)) {
      const autoParty: PartyMaster = {
        id: `party-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        partyName: partyVal,
        partyType: 'Supplier',
        createdAt: new Date().toISOString(),
      };
      setParties(prev => [autoParty, ...prev]);
      cloudSaveParty(autoParty);
      supabaseSaveParty(autoParty);
    }

    setPurchases(prev => [newRecord, ...prev]);
    lastCloudModifiedRef.current = Date.now();
    cloudSavePurchase(newRecord);
    supabaseSavePurchase(newRecord);
    showToast(`Recorded purchase of ${record.weight} Kg for ${record.itemCode} from ${partyVal}!`);
  };

  const handleUpdatePurchase = (id: string, updatedFields: Partial<PurchaseRecord>) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can modify existing purchase records.');
      return;
    }
    const partyVal = updatedFields.partyName || updatedFields.purchaseFrom;
    setPurchases(prev => prev.map(p => {
      if (p.id === id) {
        const updated = {
          ...p,
          ...updatedFields,
          partyName: partyVal ? partyVal.trim().toUpperCase() : p.partyName,
          purchaseFrom: partyVal ? partyVal.trim().toUpperCase() : p.purchaseFrom,
        };
        lastCloudModifiedRef.current = Date.now();
        cloudSavePurchase(updated);
        supabaseSavePurchase(updated);
        return updated;
      }
      return p;
    }));
    showToast('Purchase record updated!');
  };

  const handleDeletePurchase = (id: string) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can delete purchase records.');
      return;
    }
    setPurchases(prev => prev.filter(p => p.id !== id));
    lastCloudModifiedRef.current = Date.now();
    cloudDeletePurchase(id);
    supabaseDeletePurchase(id);
    showToast('Purchase entry deleted.');
  };

  // ----------------------------------------------------
  // ISSUE ACTIONS
  // ----------------------------------------------------
  const handleAddIssue = (record: Omit<IssueRecord, 'id' | 'createdAt'>) => {
    const partyVal = (record.partyName || record.issueTo || '').trim().toUpperCase();
    const newRecord: IssueRecord = {
      ...record,
      partyName: partyVal,
      issueTo: partyVal,
      id: `iss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    // Auto-create item in master if not already present
    const cleanCode = record.itemCode.trim().toUpperCase();
    const itemExists = items.some(i => i.itemCode.trim().toUpperCase() === cleanCode);
    if (!itemExists) {
      const autoItem: ItemMaster = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemName: record.itemName,
        millName: record.millName,
        itemCode: cleanCode,
        unit: record.unit || 'Kg',
        openingStock: 0,
        minStockAlert: 50,
        createdAt: new Date().toISOString(),
      };
      setItems(prev => [autoItem, ...prev]);
      cloudSaveItem(autoItem);
      supabaseSaveItem(autoItem);
    }

    // Auto-create party in master if not already present
    if (partyVal && !parties.some(p => p.partyName.trim().toUpperCase() === partyVal)) {
      const autoParty: PartyMaster = {
        id: `party-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        partyName: partyVal,
        partyType: 'Customer',
        createdAt: new Date().toISOString(),
      };
      setParties(prev => [autoParty, ...prev]);
      cloudSaveParty(autoParty);
      supabaseSaveParty(autoParty);
    }

    setIssues(prev => [newRecord, ...prev]);
    lastCloudModifiedRef.current = Date.now();
    cloudSaveIssue(newRecord);
    supabaseSaveIssue(newRecord);
    showToast(`Issued ${record.weight} Kg of ${record.itemCode} to ${partyVal}!`);
  };

  const handleUpdateIssue = (id: string, updatedFields: Partial<IssueRecord>) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can modify existing issue records.');
      return;
    }
    const partyVal = updatedFields.partyName || updatedFields.issueTo;
    setIssues(prev => prev.map(i => {
      if (i.id === id) {
        const updated = {
          ...i,
          ...updatedFields,
          partyName: partyVal ? partyVal.trim().toUpperCase() : i.partyName,
          issueTo: partyVal ? partyVal.trim().toUpperCase() : i.issueTo,
        };
        lastCloudModifiedRef.current = Date.now();
        cloudSaveIssue(updated);
        supabaseSaveIssue(updated);
        return updated;
      }
      return i;
    }));
    showToast('Issue record updated!');
  };

  const handleDeleteIssue = (id: string) => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Only Administrator can delete issue records.');
      return;
    }
    setIssues(prev => prev.filter(i => i.id !== id));
    lastCloudModifiedRef.current = Date.now();
    cloudDeleteIssue(id);
    supabaseDeleteIssue(id);
    showToast('Issue entry deleted.');
  };

  // ----------------------------------------------------
  // EXPORT / IMPORT / RESET
  // ----------------------------------------------------
  const handleExportExcel = () => {
    exportWorkbookToExcel(items, purchases, issues, stockBalances, parties, partySummaries);
    showToast('Excel workbook (.xlsx) downloaded with all sheets!');
  };

  const handleImportExcel = (file: File) => {
    parseExcelImport(
      file,
      async (importedData) => {
        let importedCount = 0;
        let updatedParties = [...parties];
        let updatedItems = [...items];
        let updatedPurchases = [...purchases];
        let updatedIssues = [...issues];

        if (importedData.parties && importedData.parties.length > 0) {
          const existingParties = new Set(parties.map(p => p.partyName.toUpperCase()));
          const newParties = importedData.parties.filter(p => !existingParties.has(p.partyName.toUpperCase()));
          if (newParties.length > 0) {
            updatedParties = [...updatedParties, ...newParties];
            setParties(updatedParties);
            importedCount += newParties.length;
          }
        }
        if (importedData.items && importedData.items.length > 0) {
          const existingCodes = new Set(items.map(i => i.itemCode.toUpperCase()));
          const newItems = importedData.items.filter(i => !existingCodes.has(i.itemCode.toUpperCase()));
          if (newItems.length > 0) {
            updatedItems = [...updatedItems, ...newItems];
            setItems(updatedItems);
            importedCount += newItems.length;
          }
        }
        if (importedData.purchases && importedData.purchases.length > 0) {
          updatedPurchases = [...importedData.purchases, ...updatedPurchases];
          setPurchases(updatedPurchases);
          importedCount += importedData.purchases.length;
        }
        if (importedData.issues && importedData.issues.length > 0) {
          updatedIssues = [...importedData.issues, ...updatedIssues];
          setIssues(updatedIssues);
          importedCount += importedData.issues.length;
        }

        lastCloudModifiedRef.current = Date.now();
        await syncAllToCloud({
          items: updatedItems,
          parties: updatedParties,
          purchases: updatedPurchases,
          issues: updatedIssues,
        });

        showToast(`Successfully imported ${importedCount} records and synced to Cloud!`);
      },
      (err) => {
        showToast(`Import error: ${err}`, 'error');
      }
    );
  };

  const handleResetData = () => {
    if (currentRole !== 'admin') {
      handleRequireAdmin('Administrator authorization is required to reset all stock records.');
      return;
    }
    setIsResetModalOpen(true);
  };

  const executeResetData = () => {
    const reset = resetToDefaultData();
    setItems(reset.items);
    setPurchases(reset.purchases);
    setIssues(reset.issues);
    setParties(reset.parties);
    lastCloudModifiedRef.current = Date.now();
    cloudResetAll();
    showToast('All sheet records cleared. Blank workbook ready.');
  };

  // If not logged in, ask for login (asked every time app is opened, or after 10-min idle auto-logout)
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen
          onLogin={handleLogin}
          logoutReason={logoutReason}
        />
        {/* Toast Notification Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium ${
                toastMessage.type === 'success'
                  ? 'bg-slate-900 text-white border-emerald-500/50'
                  : 'bg-rose-900 text-white border-rose-500/50'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Workbook Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickEntry={(type) => setQuickEntryType(type)}
        onExportExcel={handleExportExcel}
        onImportExcel={handleImportExcel}
        onResetData={handleResetData}
        onOpenGoogleSheets={() => setIsGoogleModalOpen(true)}
        googleSheetConnection={googleConnection}
        onOpenSupabase={() => {
          setIsSupabaseConnected(isSupabaseConfigured());
          setIsSupabaseModalOpen(true);
        }}
        isSupabaseActive={isSupabaseConnected}
        totalStockWeight={totalStockWeight}
        totalItemsCount={items.length}
        totalPurchasesCount={purchases.length}
        totalIssuesCount={issues.length}
        currentRole={currentRole}
        onOpenRoleModal={(reason) => {
          setRoleModalReason(reason || null);
          setIsRoleModalOpen(true);
        }}
        onLogout={() => handleLogout('manual')}
        operatorName={operatorName}
        isCloudLive={isCloudLive}
      />

      {/* Excel Sheet Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reportCount={stockBalances.length}
        purchaseCount={purchases.length}
        issueCount={issues.length}
        itemCount={items.length}
        partyCount={parties.length}
        partyReportCount={partySummaries.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Stock Report */}
          {activeTab === 'report' && (
            <motion.div
              key="tab-report"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <ReportSheet
                stockBalances={stockBalances}
                onViewLedger={(code) => setLedgerItemCode(code)}
                onExportExcel={handleExportExcel}
              />
            </motion.div>
          )}

          {/* TAB 2: Purchase Sheet */}
          {activeTab === 'purchase' && (
            <motion.div
              key="tab-purchase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <PurchaseSheet
                purchases={purchases}
                items={items}
                parties={parties}
                onAddPurchase={handleAddPurchase}
                onUpdatePurchase={handleUpdatePurchase}
                onDeletePurchase={handleDeletePurchase}
                onViewLedger={(code) => setLedgerItemCode(code)}
                userRole={currentRole}
                onRequireAdmin={handleRequireAdmin}
              />
            </motion.div>
          )}

          {/* TAB 3: Issue Sheet */}
          {activeTab === 'issue' && (
            <motion.div
              key="tab-issue"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <IssueSheet
                issues={issues}
                items={items}
                parties={parties}
                stockBalances={stockBalances}
                onAddIssue={handleAddIssue}
                onUpdateIssue={handleUpdateIssue}
                onDeleteIssue={handleDeleteIssue}
                onViewLedger={(code) => setLedgerItemCode(code)}
                userRole={currentRole}
                onRequireAdmin={handleRequireAdmin}
              />
            </motion.div>
          )}

          {/* TAB 4: Party-Wise Material Report */}
          {activeTab === 'party-report' && (
            <motion.div
              key="tab-party-report"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <PartyReportSheet
                parties={parties}
                purchases={purchases}
                issues={issues}
                onViewPartyLedger={(partyName) => setLedgerPartyName(partyName)}
                onNavigateToPartyMaster={() => setActiveTab('parties')}
              />
            </motion.div>
          )}

          {/* TAB 5: Party Master Sheet */}
          {activeTab === 'parties' && (
            <motion.div
              key="tab-parties"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <PartyMasterSheet
                parties={parties}
                purchases={purchases}
                issues={issues}
                onAddParty={handleAddParty}
                onUpdateParty={handleUpdateParty}
                onDeleteParty={handleDeleteParty}
                onViewPartyLedger={(partyName) => setLedgerPartyName(partyName)}
                userRole={currentRole}
                onRequireAdmin={handleRequireAdmin}
              />
            </motion.div>
          )}

          {/* TAB 6: Item Master Sheet */}
          {activeTab === 'items' && (
            <motion.div
              key="tab-items"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <ItemMasterSheet
                items={items}
                stockBalances={stockBalances}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onViewLedger={(code) => setLedgerItemCode(code)}
                userRole={currentRole}
                onRequireAdmin={handleRequireAdmin}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Item Movement Ledger Modal */}
      <LedgerModal
        itemCode={ledgerItemCode}
        items={items}
        purchases={purchases}
        issues={issues}
        onClose={() => setLedgerItemCode(null)}
      />

      {/* Party Material Statement / Ledger Modal */}
      <PartyLedgerModal
        partyName={ledgerPartyName}
        parties={parties}
        purchases={purchases}
        issues={issues}
        onClose={() => setLedgerPartyName(null)}
      />

      {/* Quick Entry Modal */}
      <QuickEntryModal
        type={quickEntryType}
        items={items}
        stockBalances={stockBalances}
        onClose={() => setQuickEntryType(null)}
        onAddPurchase={handleAddPurchase}
        onAddIssue={handleAddIssue}
        onAddItem={handleAddItem}
      />

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetData}
      />

      {/* Google Sheets Live Sync Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        currentUser={currentUser}
        accessToken={accessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
        onAuthLogout={() => {
          setCurrentUser(null);
          setAccessToken(null);
        }}
        items={items}
        purchases={purchases}
        issues={issues}
        stockBalances={stockBalances}
        connection={googleConnection}
        onUpdateConnection={(conn) => setGoogleConnection(conn)}
        onImportData={({ items: impItems, purchases: impPurchases, issues: impIssues }) => {
          if (impItems && impItems.length > 0) {
            setItems(impItems);
          }
          if (impPurchases) {
            setPurchases(impPurchases);
          }
          if (impIssues) {
            setIssues(impIssues);
          }
        }}
        showToast={showToast}
      />

      {/* Supabase PostgreSQL Database Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => {
          setIsSupabaseConnected(isSupabaseConfigured());
          setIsSupabaseModalOpen(false);
        }}
        parties={parties}
        items={items}
        purchases={purchases}
        issues={issues}
        onDataLoaded={(data) => {
          if (data.parties) setParties(data.parties);
          if (data.items) setItems(data.items);
          if (data.purchases) setPurchases(data.purchases);
          if (data.issues) setIssues(data.issues);
          setIsSupabaseConnected(true);
          showToast('Updated local workbook from Supabase!', 'success');
        }}
      />

      {/* Role Switcher & Admin PIN Modal */}
      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setRoleModalReason(null);
        }}
        currentRole={currentRole}
        onRoleChange={(newRole) => {
          setCurrentRole(newRole);
          saveStoredRole(newRole);
          showToast(newRole === 'admin' ? 'Switched to Admin Role. You have full edit and delete permissions.' : 'Switched to User Role. Create and entry enabled, delete/edit restricted.');
        }}
        authorizationReason={roleModalReason}
      />

      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/50'
                : 'bg-rose-900 text-white border-rose-500/50'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-3 border-t border-slate-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-300">Stock Record & Inventory Sheet</span>
            <span>•</span>
            <span>Item Code Pattern: <code className="text-purple-300 font-mono">ItemName-MillName</code> (e.g. 30S-BHILOSA)</span>
          </div>
          <div className="text-slate-400">
            Real Multi-Sheet Excel Workbook System (.xlsx)
          </div>
        </div>
      </footer>

    </div>
  );
}
