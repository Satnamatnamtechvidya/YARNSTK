import * as XLSX from 'xlsx';
import { 
  ItemMaster, 
  PurchaseRecord, 
  IssueRecord, 
  StockBalanceItem, 
  PartyMaster, 
  PartySummaryItem,
  PartyType
} from '../types';

export function exportWorkbookToExcel(
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[],
  stockReport: StockBalanceItem[],
  parties: PartyMaster[] = [],
  partyReport: PartySummaryItem[] = [],
  filename: string = `Stock_Record_Workbook_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Stock Report
  const reportData = stockReport.map((s, idx) => ({
    'Sr.': idx + 1,
    'Item Code': s.itemCode,
    'Item Name': s.itemName,
    'Mill Name': s.millName,
    'Unit': s.unit,
    'Opening (Wt)': s.openingStock,
    'Total Purchase (Wt)': s.totalPurchaseWeight,
    'Total Issue (Wt)': s.totalIssueWeight,
    'Balance Weight': s.balanceWeight,
    'Stock Status': s.status,
    'Last Purchase Date': s.lastPurchaseDate || '-',
    'Last Issue Date': s.lastIssueDate || '-',
  }));
  const wsReport = XLSX.utils.json_to_sheet(reportData);
  wsReport['!cols'] = [
    { wch: 6 },  // Sr
    { wch: 18 }, // Item Code
    { wch: 14 }, // Item Name
    { wch: 16 }, // Mill Name
    { wch: 8 },  // Unit
    { wch: 14 }, // Opening
    { wch: 20 }, // Total Purchase
    { wch: 18 }, // Total Issue
    { wch: 18 }, // Balance
    { wch: 14 }, // Status
    { wch: 18 }, // Last Purchase
    { wch: 18 }, // Last Issue
  ];
  XLSX.utils.book_append_sheet(wb, wsReport, 'Stock Report');

  // 2. Sheet: Purchase Sheet
  const purchaseData = purchases.map((p, idx) => ({
    'Sr.': idx + 1,
    'Date': p.date,
    'Bill No.': p.billNo,
    'Party Name': p.partyName || p.purchaseFrom || '',
    'Item Code': p.itemCode,
    'Item Name': p.itemName,
    'Mill Name': p.millName,
    'Weight (Kg)': p.weight,
    'Unit': p.unit || 'Kg',
    'Remarks': p.remarks || '',
  }));
  const wsPurchase = XLSX.utils.json_to_sheet(purchaseData);
  wsPurchase['!cols'] = [
    { wch: 6 },  // Sr
    { wch: 14 }, // Date
    { wch: 16 }, // Bill No
    { wch: 26 }, // Party Name
    { wch: 18 }, // Item Code
    { wch: 14 }, // Item Name
    { wch: 16 }, // Mill Name
    { wch: 14 }, // Weight
    { wch: 8 },  // Unit
    { wch: 30 }, // Remarks
  ];
  XLSX.utils.book_append_sheet(wb, wsPurchase, 'Purchase Sheet');

  // 3. Sheet: Issue Sheet
  const issueData = issues.map((i, idx) => ({
    'Sr.': idx + 1,
    'Date': i.date,
    'Bill No.': i.billNo,
    'Party Name': i.partyName || i.issueTo || '',
    'Item Code': i.itemCode,
    'Item Name': i.itemName,
    'Mill Name': i.millName,
    'Weight (Kg)': i.weight,
    'Unit': i.unit || 'Kg',
    'Remarks': i.remarks || '',
  }));
  const wsIssue = XLSX.utils.json_to_sheet(issueData);
  wsIssue['!cols'] = [
    { wch: 6 },  // Sr
    { wch: 14 }, // Date
    { wch: 16 }, // Bill No
    { wch: 26 }, // Party Name
    { wch: 18 }, // Item Code
    { wch: 14 }, // Item Name
    { wch: 16 }, // Mill Name
    { wch: 14 }, // Weight
    { wch: 8 },  // Unit
    { wch: 30 }, // Remarks
  ];
  XLSX.utils.book_append_sheet(wb, wsIssue, 'Issue Sheet');

  // 4. Sheet: Party-wise Report (if available)
  if (partyReport.length > 0) {
    const partyReportData = partyReport.map((pr, idx) => ({
      'Sr.': idx + 1,
      'Party Name': pr.partyName,
      'Party Type': pr.partyType || 'Both',
      'Contact Person': pr.contactPerson || '-',
      'Phone': pr.phone || '-',
      'City': pr.city || '-',
      'Total Purchased (Kg)': pr.totalPurchasedWeight,
      'Total Issued (Kg)': pr.totalIssuedWeight,
      'Net Balance (Kg)': pr.netBalanceWeight,
      'Purchase Count': pr.purchaseCount,
      'Issue Count': pr.issueCount,
      'Total Transactions': pr.totalTransactions,
      'Last Transaction Date': pr.lastTransactionDate || '-',
    }));
    const wsPartyReport = XLSX.utils.json_to_sheet(partyReportData);
    wsPartyReport['!cols'] = [
      { wch: 6 },  // Sr
      { wch: 28 }, // Party Name
      { wch: 14 }, // Party Type
      { wch: 18 }, // Contact
      { wch: 14 }, // Phone
      { wch: 16 }, // City
      { wch: 22 }, // Total Purchased
      { wch: 20 }, // Total Issued
      { wch: 20 }, // Net Balance
      { wch: 16 }, // Purchase count
      { wch: 14 }, // Issue count
      { wch: 18 }, // Total Txns
      { wch: 20 }, // Last Txn Date
    ];
    XLSX.utils.book_append_sheet(wb, wsPartyReport, 'Party Report');
  }

  // 5. Sheet: Party Master (if available)
  if (parties.length > 0) {
    const partyMasterData = parties.map((pm, idx) => ({
      'Sr.': idx + 1,
      'Party Name': pm.partyName,
      'Party Type': pm.partyType,
      'Contact Person': pm.contactPerson || '',
      'Phone': pm.phone || '',
      'City': pm.city || '',
      'GSTIN': pm.gstin || '',
      'Remarks': pm.remarks || '',
    }));
    const wsPartyMaster = XLSX.utils.json_to_sheet(partyMasterData);
    wsPartyMaster['!cols'] = [
      { wch: 6 },  // Sr
      { wch: 28 }, // Party Name
      { wch: 14 }, // Party Type
      { wch: 18 }, // Contact
      { wch: 16 }, // Phone
      { wch: 16 }, // City
      { wch: 18 }, // GSTIN
      { wch: 30 }, // Remarks
    ];
    XLSX.utils.book_append_sheet(wb, wsPartyMaster, 'Party Master');
  }

  // 6. Sheet: Item Master
  const masterData = items.map((it, idx) => ({
    'Sr.': idx + 1,
    'Item Code': it.itemCode,
    'Item Name': it.itemName,
    'Mill Name': it.millName,
    'Unit': it.unit || 'Kg',
    'Min Stock Alert': it.minStockAlert ?? 50,
    'Opening Stock': it.openingStock ?? 0,
    'Remarks': it.remarks || '',
  }));
  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  wsMaster['!cols'] = [
    { wch: 6 },  // Sr
    { wch: 18 }, // Item Code
    { wch: 14 }, // Item Name
    { wch: 16 }, // Mill Name
    { wch: 8 },  // Unit
    { wch: 16 }, // Min Stock Alert
    { wch: 14 }, // Opening Stock
    { wch: 30 }, // Remarks
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Item Master');

  // Write and trigger download
  XLSX.writeFile(wb, filename);
}

export function parseExcelImport(
  file: File,
  onSuccess: (data: {
    items?: ItemMaster[];
    purchases?: PurchaseRecord[];
    issues?: IssueRecord[];
    parties?: PartyMaster[];
  }) => void,
  onError: (err: string) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const buffer = e.target?.result;
      if (!buffer) throw new Error('File read failure');
      const wb = XLSX.read(buffer, { type: 'binary' });

      const parsed: {
        items?: ItemMaster[];
        purchases?: PurchaseRecord[];
        issues?: IssueRecord[];
        parties?: PartyMaster[];
      } = {};

      // Match sheets case-insensitively
      wb.SheetNames.forEach(sheetName => {
        const lower = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rawJson: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

        if (lower.includes('partymaster') || lower === 'parties' || lower === 'party') {
          parsed.parties = rawJson.map((row: any, idx) => {
            const partyName = String(row['Party Name'] || row['partyName'] || row['Name'] || '').trim().toUpperCase();
            if (!partyName) return null;
            return {
              id: `imported-party-${Date.now()}-${idx}`,
              partyName,
              partyType: (row['Party Type'] || row['partyType'] || 'Both') as PartyType,
              contactPerson: String(row['Contact Person'] || row['contactPerson'] || '').trim(),
              phone: String(row['Phone'] || row['phone'] || '').trim(),
              city: String(row['City'] || row['city'] || '').trim(),
              gstin: String(row['GSTIN'] || row['gstin'] || '').trim().toUpperCase(),
              remarks: String(row['Remarks'] || '').trim(),
              createdAt: new Date().toISOString(),
            };
          }).filter(Boolean) as PartyMaster[];
        } else if (lower.includes('item') || lower.includes('master')) {
          parsed.items = rawJson.map((row: any, idx) => {
            const itemName = String(row['Item Name'] || row['itemName'] || row['Item'] || '').trim();
            const millName = String(row['Mill Name'] || row['millName'] || row['Mill'] || '').trim();
            const itemCode = String(row['Item Code'] || row['itemCode'] || (itemName && millName ? `${itemName}-${millName}` : itemName) || `ITEM-${idx + 1}`).trim().toUpperCase();
            return {
              id: `imported-item-${Date.now()}-${idx}`,
              itemName: itemName || itemCode.split('-')[0] || itemCode,
              millName: millName || (itemCode.includes('-') ? itemCode.split('-').slice(1).join('-') : 'GENERAL'),
              itemCode,
              unit: String(row['Unit'] || 'Kg'),
              minStockAlert: Number(row['Min Stock Alert'] || row['Min Alert'] || 50),
              openingStock: Number(row['Opening Stock'] || row['Opening (Wt)'] || 0),
              remarks: String(row['Remarks'] || ''),
              createdAt: new Date().toISOString(),
            };
          }).filter(i => i.itemCode);
        } else if (lower.includes('purchase') || lower.includes('inward') || lower.includes('buy')) {
          parsed.purchases = rawJson.map((row: any, idx) => {
            const itemCode = String(row['Item Code'] || row['itemCode'] || '').trim().toUpperCase();
            const itemName = String(row['Item Name'] || row['itemName'] || itemCode.split('-')[0] || '').trim();
            const millName = String(row['Mill Name'] || row['millName'] || (itemCode.includes('-') ? itemCode.split('-').slice(1).join('-') : '')).trim();
            const party = String(row['Party Name'] || row['partyName'] || row['Purchase From'] || row['purchaseFrom'] || row['Supplier'] || row['Vendor'] || 'Supplier').trim().toUpperCase();
            return {
              id: `imported-pur-${Date.now()}-${idx}`,
              date: String(row['Date'] || row['date'] || new Date().toISOString().slice(0, 10)),
              billNo: String(row['Bill No.'] || row['Bill No'] || row['billNo'] || row['Invoice'] || `BILL-${idx + 1}`),
              partyName: party,
              purchaseFrom: party,
              itemCode: itemCode || (itemName && millName ? `${itemName}-${millName}`.toUpperCase() : 'UNKNOWN'),
              itemName,
              millName,
              weight: Number(row['Weight'] || row['weight'] || row['Weight (Kg)'] || row['Qty'] || 0),
              unit: String(row['Unit'] || 'Kg'),
              remarks: String(row['Remarks'] || ''),
              createdAt: new Date().toISOString(),
            };
          }).filter(p => p.itemCode && p.weight > 0);
        } else if (lower.includes('issue') || lower.includes('outward') || lower.includes('dispatch')) {
          parsed.issues = rawJson.map((row: any, idx) => {
            const itemCode = String(row['Item Code'] || row['itemCode'] || '').trim().toUpperCase();
            const itemName = String(row['Item Name'] || row['itemName'] || itemCode.split('-')[0] || '').trim();
            const millName = String(row['Mill Name'] || row['millName'] || (itemCode.includes('-') ? itemCode.split('-').slice(1).join('-') : '')).trim();
            const party = String(row['Party Name'] || row['partyName'] || row['Issue To'] || row['issueTo'] || row['Customer'] || row['Department'] || 'Dept').trim().toUpperCase();
            return {
              id: `imported-iss-${Date.now()}-${idx}`,
              date: String(row['Date'] || row['date'] || new Date().toISOString().slice(0, 10)),
              billNo: String(row['Bill No.'] || row['Bill No'] || row['billNo'] || row['Challan'] || `ISS-${idx + 1}`),
              partyName: party,
              issueTo: party,
              itemCode: itemCode || (itemName && millName ? `${itemName}-${millName}`.toUpperCase() : 'UNKNOWN'),
              itemName,
              millName,
              weight: Number(row['Weight'] || row['weight'] || row['Weight (Kg)'] || row['Qty'] || 0),
              unit: String(row['Unit'] || 'Kg'),
              remarks: String(row['Remarks'] || ''),
              createdAt: new Date().toISOString(),
            };
          }).filter(i => i.itemCode && i.weight > 0);
        }
      });

      onSuccess(parsed);
    } catch (err: any) {
      onError(err.message || 'Failed to parse Excel file.');
    }
  };
  reader.onerror = () => onError('File reading failed.');
  reader.readAsBinaryString(file);
}
