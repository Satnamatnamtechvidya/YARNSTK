import { 
  ItemMaster, 
  PartyMaster,
  PurchaseRecord, 
  IssueRecord, 
  StockBalanceItem, 
  LedgerMovement, 
  PartySummaryItem,
  PartyLedgerMovement,
  GoogleSheetConnection 
} from '../types';

const STORAGE_KEYS = {
  ITEMS: 'stock_excel_items_v2',
  PURCHASES: 'stock_excel_purchases_v2',
  ISSUES: 'stock_excel_issues_v2',
  PARTIES: 'stock_excel_parties_v2',
  GOOGLE_SHEET: 'stock_excel_google_sheet_v1',
};

// Default clean state: no dummy/sample records
export const DEFAULT_ITEMS: ItemMaster[] = [];
export const DEFAULT_PURCHASES: PurchaseRecord[] = [];
export const DEFAULT_ISSUES: IssueRecord[] = [];
export const DEFAULT_PARTIES: PartyMaster[] = [];

// Sample IDs to permanently strip out if lingering from older storage sessions
const SAMPLE_ITEM_IDS = new Set(['item-1', 'item-2', 'item-3', 'item-4', 'item-5']);
const SAMPLE_PURCHASE_IDS = new Set(['pur-1', 'pur-2', 'pur-3', 'pur-4', 'pur-5']);
const SAMPLE_ISSUE_IDS = new Set(['iss-1', 'iss-2', 'iss-3', 'iss-4']);
const SAMPLE_PARTY_IDS = new Set(['party-1', 'party-2', 'party-3', 'party-4']);

export function getStoredItems(): ItemMaster[] {
  try {
    // Check and clean legacy storage if present
    const legacy = localStorage.getItem('stock_excel_items_v1');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        const filtered = Array.isArray(parsed) ? parsed.filter((it: ItemMaster) => !SAMPLE_ITEM_IDS.has(it.id)) : [];
        if (filtered.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }
      localStorage.removeItem('stock_excel_items_v1');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
      return [];
    }
    const parsed: ItemMaster[] = JSON.parse(raw);
    const cleaned = Array.isArray(parsed) ? parsed.filter(it => !SAMPLE_ITEM_IDS.has(it.id)) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Error loading items from localStorage', e);
    return [];
  }
}

export function saveStoredItems(items: ItemMaster[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving items to localStorage', e);
  }
}

export function getStoredParties(): PartyMaster[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTIES);
    if (!raw) {
      // Auto-extract parties from existing purchases and issues if available
      const existingPurchases = getStoredPurchases();
      const existingIssues = getStoredIssues();
      const autoParties: PartyMaster[] = [];
      const seen = new Set<string>();

      existingPurchases.forEach((p, idx) => {
        const name = (p.partyName || p.purchaseFrom || '').trim();
        if (name && !seen.has(name.toUpperCase())) {
          seen.add(name.toUpperCase());
          autoParties.push({
            id: `party-auto-${Date.now()}-${idx}`,
            partyName: name,
            partyType: 'Supplier',
            createdAt: p.createdAt || new Date().toISOString(),
          });
        }
      });

      existingIssues.forEach((iss, idx) => {
        const name = (iss.partyName || iss.issueTo || '').trim();
        if (name && !seen.has(name.toUpperCase())) {
          seen.add(name.toUpperCase());
          autoParties.push({
            id: `party-auto-${Date.now()}-iss-${idx}`,
            partyName: name,
            partyType: 'Customer',
            createdAt: iss.createdAt || new Date().toISOString(),
          });
        }
      });

      localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(autoParties));
      return autoParties;
    }
    const parsed: PartyMaster[] = JSON.parse(raw);
    const cleaned = Array.isArray(parsed) ? parsed.filter(p => !SAMPLE_PARTY_IDS.has(p.id)) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Error loading parties from localStorage', e);
    return [];
  }
}

export function saveStoredParties(parties: PartyMaster[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(parties));
  } catch (e) {
    console.error('Error saving parties to localStorage', e);
  }
}

export function getStoredPurchases(): PurchaseRecord[] {
  try {
    // Check and clean legacy storage if present
    const legacy = localStorage.getItem('stock_excel_purchases_v1');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        const filtered = Array.isArray(parsed) ? parsed.filter((p: PurchaseRecord) => !SAMPLE_PURCHASE_IDS.has(p.id)) : [];
        if (filtered.length > 0) {
          localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }
      localStorage.removeItem('stock_excel_purchases_v1');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
      return [];
    }
    const parsed: PurchaseRecord[] = JSON.parse(raw);
    const cleaned = Array.isArray(parsed) 
      ? parsed
          .filter(p => !SAMPLE_PURCHASE_IDS.has(p.id))
          .map(p => {
            const party = (p.partyName || p.purchaseFrom || '').trim();
            return {
              ...p,
              partyName: party,
              purchaseFrom: party,
            };
          })
      : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Error loading purchases from localStorage', e);
    return [];
  }
}

export function saveStoredPurchases(purchases: PurchaseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  } catch (e) {
    console.error('Error saving purchases to localStorage', e);
  }
}

export function getStoredIssues(): IssueRecord[] {
  try {
    // Check and clean legacy storage if present
    const legacy = localStorage.getItem('stock_excel_issues_v1');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        const filtered = Array.isArray(parsed) ? parsed.filter((iss: IssueRecord) => !SAMPLE_ISSUE_IDS.has(iss.id)) : [];
        if (filtered.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }
      localStorage.removeItem('stock_excel_issues_v1');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.ISSUES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify([]));
      return [];
    }
    const parsed: IssueRecord[] = JSON.parse(raw);
    const cleaned = Array.isArray(parsed) 
      ? parsed
          .filter(iss => !SAMPLE_ISSUE_IDS.has(iss.id))
          .map(iss => {
            const party = (iss.partyName || iss.issueTo || '').trim();
            return {
              ...iss,
              partyName: party,
              issueTo: party,
            };
          })
      : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Error loading issues from localStorage', e);
    return [];
  }
}

export function saveStoredIssues(issues: IssueRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(issues));
  } catch (e) {
    console.error('Error saving issues to localStorage', e);
  }
}

export function resetToDefaultData(): { 
  items: ItemMaster[]; 
  purchases: PurchaseRecord[]; 
  issues: IssueRecord[];
  parties: PartyMaster[];
} {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify([]));
  localStorage.removeItem('stock_excel_items_v1');
  localStorage.removeItem('stock_excel_purchases_v1');
  localStorage.removeItem('stock_excel_issues_v1');
  return {
    items: [],
    purchases: [],
    issues: [],
    parties: [],
  };
}

// Generate canonical item code from item name and mill name
export function formatItemCode(itemName: string, millName: string): string {
  const cleanItem = itemName.trim().toUpperCase();
  const cleanMill = millName.trim().toUpperCase();
  if (!cleanItem && !cleanMill) return '';
  if (!cleanMill) return cleanItem;
  if (!cleanItem) return cleanMill;
  return `${cleanItem}-${cleanMill}`;
}

// Calculate comprehensive stock balances
export function calculateStockBalances(
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[]
): StockBalanceItem[] {
  // Group all items
  const itemMap = new Map<string, ItemMaster>();
  items.forEach(it => {
    itemMap.set(it.itemCode.trim().toUpperCase(), it);
  });

  // Calculate purchase weights per itemCode
  const purchaseSumMap = new Map<string, { total: number; lastDate: string }>();
  purchases.forEach(p => {
    const code = p.itemCode.trim().toUpperCase();
    const current = purchaseSumMap.get(code) || { total: 0, lastDate: '' };
    current.total += Number(p.weight) || 0;
    if (!current.lastDate || p.date > current.lastDate) {
      current.lastDate = p.date;
    }
    purchaseSumMap.set(code, current);
  });

  // Calculate issue weights per itemCode
  const issueSumMap = new Map<string, { total: number; lastDate: string }>();
  issues.forEach(i => {
    const code = i.itemCode.trim().toUpperCase();
    const current = issueSumMap.get(code) || { total: 0, lastDate: '' };
    current.total += Number(i.weight) || 0;
    if (!current.lastDate || i.date > current.lastDate) {
      current.lastDate = i.date;
    }
    issueSumMap.set(code, current);
  });

  // Combine all item codes from items, purchases, issues
  const allCodes = new Set<string>();
  items.forEach(i => allCodes.add(i.itemCode.trim().toUpperCase()));
  purchases.forEach(p => allCodes.add(p.itemCode.trim().toUpperCase()));
  issues.forEach(i => allCodes.add(i.itemCode.trim().toUpperCase()));

  const reportItems: StockBalanceItem[] = [];

  allCodes.forEach(code => {
    if (!code) return;
    const master = itemMap.get(code);
    
    // Find matching purchase or issue record if not in master
    let itemName = master?.itemName;
    let millName = master?.millName;

    if (!itemName || !millName) {
      const pMatch = purchases.find(p => p.itemCode.trim().toUpperCase() === code);
      const iMatch = issues.find(i => i.itemCode.trim().toUpperCase() === code);
      itemName = pMatch?.itemName || iMatch?.itemName || code.split('-')[0] || code;
      millName = pMatch?.millName || iMatch?.millName || (code.includes('-') ? code.split('-').slice(1).join('-') : '');
    }

    const opening = Number(master?.openingStock) || 0;
    const purInfo = purchaseSumMap.get(code) || { total: 0, lastDate: undefined };
    const issInfo = issueSumMap.get(code) || { total: 0, lastDate: undefined };

    const totalPur = purInfo.total;
    const totalIss = issInfo.total;
    const balance = opening + totalPur - totalIss;
    const minAlert = master?.minStockAlert ?? 50;

    let status: StockBalanceItem['status'] = 'In Stock';
    if (balance < 0) {
      status = 'Negative';
    } else if (balance === 0) {
      status = 'Out of Stock';
    } else if (balance <= minAlert) {
      status = 'Low Stock';
    }

    reportItems.push({
      itemCode: code,
      itemName: itemName || code,
      millName: millName || '-',
      unit: master?.unit || 'Kg',
      openingStock: opening,
      totalPurchaseWeight: totalPur,
      totalIssueWeight: totalIss,
      balanceWeight: balance,
      lastPurchaseDate: purInfo.lastDate,
      lastIssueDate: issInfo.lastDate,
      minStockAlert: minAlert,
      status,
    });
  });

  // Sort by item code alphabetically
  return reportItems.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

// Generate chronological ledger for a specific item code
export function getItemLedger(
  itemCode: string,
  purchases: PurchaseRecord[],
  issues: IssueRecord[],
  openingStock: number = 0
): LedgerMovement[] {
  const code = itemCode.trim().toUpperCase();
  
  const relevantPurchases = purchases
    .filter(p => p.itemCode.trim().toUpperCase() === code)
    .map(p => ({
      id: p.id,
      date: p.date,
      billNo: p.billNo,
      type: 'PURCHASE' as const,
      party: p.partyName || p.purchaseFrom || 'Unknown',
      inWeight: Number(p.weight) || 0,
      outWeight: 0,
      runningBalance: 0,
      remarks: p.remarks,
      createdAt: p.createdAt || p.date,
    }));

  const relevantIssues = issues
    .filter(i => i.itemCode.trim().toUpperCase() === code)
    .map(i => ({
      id: i.id,
      date: i.date,
      billNo: i.billNo,
      type: 'ISSUE' as const,
      party: i.partyName || i.issueTo || 'Unknown',
      inWeight: 0,
      outWeight: Number(i.weight) || 0,
      runningBalance: 0,
      remarks: i.remarks,
      createdAt: i.createdAt || i.date,
    }));

  const combined = [...relevantPurchases, ...relevantIssues].sort((a, b) => {
    if (a.date === b.date) {
      if (a.type !== b.type) {
        return a.type === 'PURCHASE' ? -1 : 1;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    }
    return a.date.localeCompare(b.date);
  });

  let currentBalance = openingStock;
  return combined.map(entry => {
    currentBalance = currentBalance + entry.inWeight - entry.outWeight;
    return {
      ...entry,
      runningBalance: Math.round(currentBalance * 100) / 100,
    };
  });
}

// Generate Party-wise Summary (purchased / issued totals, net balance)
export function calculatePartySummaries(
  parties: PartyMaster[] = [],
  purchases: PurchaseRecord[] = [],
  issues: IssueRecord[] = []
): PartySummaryItem[] {
  const safeParties = Array.isArray(parties) ? parties : [];
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const safeIssues = Array.isArray(issues) ? issues : [];

  const partyMap = new Map<string, PartyMaster>();
  safeParties.forEach(p => {
    if (p && p.partyName) {
      partyMap.set(p.partyName.trim().toUpperCase(), p);
    }
  });

  // Track all unique party names across master and records
  const allPartyNames = new Set<string>();
  safeParties.forEach(p => {
    if (p?.partyName?.trim()) allPartyNames.add(p.partyName.trim());
  });
  safePurchases.forEach(p => {
    const name = (p?.partyName || p?.purchaseFrom || '').trim();
    if (name) allPartyNames.add(name);
  });
  safeIssues.forEach(i => {
    const name = (i?.partyName || i?.issueTo || '').trim();
    if (name) allPartyNames.add(name);
  });

  const summaries: PartySummaryItem[] = [];

  allPartyNames.forEach(rawName => {
    const key = rawName.toUpperCase();
    const master = partyMap.get(key);

    let totalPur = 0;
    let totalIss = 0;
    let purCount = 0;
    let issCount = 0;
    let lastDate: string | undefined = undefined;
    let lastType: 'PURCHASE' | 'ISSUE' | undefined = undefined;

    safePurchases.forEach(p => {
      const pName = (p?.partyName || p?.purchaseFrom || '').trim().toUpperCase();
      if (pName === key) {
        totalPur += Number(p?.weight) || 0;
        purCount++;
        if (!lastDate || (p.date && p.date >= lastDate)) {
          lastDate = p.date;
          lastType = 'PURCHASE';
        }
      }
    });

    safeIssues.forEach(i => {
      const iName = (i?.partyName || i?.issueTo || '').trim().toUpperCase();
      if (iName === key) {
        totalIss += Number(i?.weight) || 0;
        issCount++;
        if (!lastDate || (i.date && i.date >= lastDate)) {
          lastDate = i.date;
          lastType = 'ISSUE';
        }
      }
    });

    summaries.push({
      partyName: master?.partyName || rawName,
      partyType: master?.partyType || (totalPur > 0 && totalIss > 0 ? 'Both' : totalPur > 0 ? 'Supplier' : 'Customer'),
      contactPerson: master?.contactPerson,
      phone: master?.phone,
      city: master?.city,
      totalPurchasedWeight: Math.round(totalPur * 100) / 100,
      totalIssuedWeight: Math.round(totalIss * 100) / 100,
      netBalanceWeight: Math.round((totalPur - totalIss) * 100) / 100,
      purchaseCount: purCount,
      issueCount: issCount,
      totalTransactions: purCount + issCount,
      lastTransactionDate: lastDate,
      lastTransactionType: lastType,
    });
  });

  return summaries.sort((a, b) => a.partyName.localeCompare(b.partyName));
}

// Generate chronological movements for a specific party
export function getPartyLedger(
  partyName: string,
  purchases: PurchaseRecord[] = [],
  issues: IssueRecord[] = []
): PartyLedgerMovement[] {
  if (!partyName) return [];
  const target = partyName.trim().toUpperCase();
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const safeIssues = Array.isArray(issues) ? issues : [];

  const relevantPurchases = safePurchases
    .filter(p => (p?.partyName || p?.purchaseFrom || '').trim().toUpperCase() === target)
    .map(p => ({
      id: p.id,
      date: p.date,
      billNo: p.billNo,
      type: 'PURCHASE' as const,
      itemCode: p.itemCode,
      itemName: p.itemName,
      millName: p.millName,
      weight: Number(p.weight) || 0,
      unit: p.unit || 'Kg',
      inWeight: Number(p.weight) || 0,
      outWeight: 0,
      runningBalance: 0,
      remarks: p.remarks,
      createdAt: p.createdAt || p.date,
    }));

  const relevantIssues = safeIssues
    .filter(i => (i?.partyName || i?.issueTo || '').trim().toUpperCase() === target)
    .map(i => ({
      id: i.id,
      date: i.date,
      billNo: i.billNo,
      type: 'ISSUE' as const,
      itemCode: i.itemCode,
      itemName: i.itemName,
      millName: i.millName,
      weight: Number(i.weight) || 0,
      unit: i.unit || 'Kg',
      inWeight: 0,
      outWeight: Number(i.weight) || 0,
      runningBalance: 0,
      remarks: i.remarks,
      createdAt: i.createdAt || i.date,
    }));

  const combined = [...relevantPurchases, ...relevantIssues].sort((a, b) => {
    if (a.date === b.date) {
      if (a.type !== b.type) {
        return a.type === 'PURCHASE' ? -1 : 1;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    }
    return a.date.localeCompare(b.date);
  });

  let balance = 0;
  return combined.map(entry => {
    balance = balance + entry.inWeight - entry.outWeight;
    return {
      ...entry,
      runningBalance: Math.round(balance * 100) / 100,
    };
  });
}

export function getStoredGoogleConnection(): GoogleSheetConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOOGLE_SHEET);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading Google Sheet connection from localStorage', e);
    return null;
  }
}

export function saveStoredGoogleConnection(conn: GoogleSheetConnection | null): void {
  try {
    if (conn) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET, JSON.stringify(conn));
    } else {
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_SHEET);
    }
  } catch (e) {
    console.error('Error saving Google Sheet connection to localStorage', e);
  }
}
