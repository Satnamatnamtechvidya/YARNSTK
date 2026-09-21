export type PartyType = 'Supplier' | 'Customer' | 'Weaver' | 'Job Worker' | 'Both' | 'Other';

export interface PartyMaster {
  id: string;
  partyName: string;
  partyType?: PartyType;
  contactPerson?: string;
  phone?: string;
  city?: string;
  address?: string;
  gstin?: string;
  remarks?: string;
  createdAt: string;
}

export interface ItemMaster {
  id: string;
  itemName: string;
  millName: string;
  itemCode: string; // generated as `${itemName.trim()}-${millName.trim()}`
  unit?: string;    // e.g. "Kg", "Bags", "Lbs", "Tons" (default "Kg")
  minStockAlert?: number; // threshold for low stock alert
  openingStock?: number;
  remarks?: string;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  date: string;         // YYYY-MM-DD
  billNo: string;       // Bill No. / Invoice No.
  partyName: string;    // Party Name (Supplier / Vendor / Mill)
  purchaseFrom?: string;// Backward compatibility
  itemCode: string;     // Combination (e.g., 30S-BHILOSA)
  itemName: string;     // Auto-filled from Item Master
  millName: string;     // Auto-filled from Item Master
  weight: number;       // In weight (e.g. 500.00 kg)
  unit?: string;
  remarks?: string;
  createdAt: string;
}

export interface IssueRecord {
  id: string;
  date: string;         // YYYY-MM-DD
  billNo: string;       // Bill No. / Issue Challan No.
  partyName: string;    // Party Name (Customer / Weaver / Dept / Job Worker)
  issueTo?: string;     // Backward compatibility
  itemCode: string;     // Combination (e.g., 30S-BHILOSA)
  itemName: string;     // Auto-filled from Item Master
  millName: string;     // Auto-filled from Item Master
  weight: number;       // In weight
  unit?: string;
  remarks?: string;
  createdAt: string;
}

export interface StockBalanceItem {
  itemCode: string;
  itemName: string;
  millName: string;
  unit: string;
  openingStock: number;
  totalPurchaseWeight: number;
  totalIssueWeight: number;
  balanceWeight: number;
  lastPurchaseDate?: string;
  lastIssueDate?: string;
  minStockAlert?: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Negative';
}

export interface LedgerMovement {
  id: string;
  date: string;
  billNo: string;
  type: 'PURCHASE' | 'ISSUE';
  party: string; // partyName
  inWeight: number;
  outWeight: number;
  runningBalance: number;
  remarks?: string;
}

export interface PartySummaryItem {
  partyName: string;
  partyType?: PartyType;
  contactPerson?: string;
  phone?: string;
  city?: string;
  totalPurchasedWeight: number; // Total Inward (Purchase)
  totalIssuedWeight: number;    // Total Outward (Issue)
  netBalanceWeight: number;     // Purchased - Issued
  purchaseCount: number;
  issueCount: number;
  totalTransactions: number;
  lastTransactionDate?: string;
  lastTransactionType?: 'PURCHASE' | 'ISSUE';
}

export interface PartyLedgerMovement {
  id: string;
  date: string;
  billNo: string;
  type: 'PURCHASE' | 'ISSUE';
  itemCode: string;
  itemName: string;
  millName: string;
  weight: number;
  unit: string;
  inWeight: number;
  outWeight: number;
  runningBalance: number;
  remarks?: string;
}

export interface GoogleSheetConnection {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export type ActiveSheetTab = 'report' | 'purchase' | 'issue' | 'party-report' | 'parties' | 'items';

export type UserRole = 'admin' | 'user';

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
}
