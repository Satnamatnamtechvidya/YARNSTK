import { ItemMaster, PurchaseRecord, IssueRecord, StockBalanceItem, DriveSpreadsheetFile } from '../types';
import { formatItemCode } from './storage';

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Check if it's a URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume it's already an ID
  return trimmed;
}

/**
 * Fetch list of recent Google Sheets from the user's Google Drive
 */
export async function fetchUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=${fields}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch Google Sheets from Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
  }));
}

/**
 * Fetch spreadsheet metadata to get sheet title and tab names
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<{ title: string; sheets: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Spreadsheet not found or access denied (${res.status})`);
  }

  const data = await res.json();
  return {
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => s.properties?.title || ''),
  };
}

/**
 * Build values array for the 4 sheets
 */
function buildSheetValues(
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[],
  balances: StockBalanceItem[]
) {
  // 1. STOCK BALANCE REPORT
  const reportRows: (string | number)[][] = [
    ['STOCK BALANCE REPORT (LIVE INVENTORY)'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    [
      'S.No.',
      'Item Code',
      'Item Name',
      'Mill Name',
      'Opening Stock (Kg)',
      'Total Purchase In (Kg)',
      'Total Issue Out (Kg)',
      'Closing Balance (Kg)',
      'Unit',
      'Status',
      'Last Transaction Date',
    ],
  ];

  balances.forEach((bal, idx) => {
    reportRows.push([
      idx + 1,
      bal.itemCode,
      bal.itemName,
      bal.millName,
      bal.openingStock,
      bal.totalPurchaseWeight,
      bal.totalIssueWeight,
      bal.balanceWeight,
      bal.unit,
      bal.status,
      bal.lastIssueDate || bal.lastPurchaseDate || '-',
    ]);
  });

  // 2. PURCHASE (INVOICES)
  const purchaseRows: (string | number)[][] = [
    [
      'S.No.',
      'Date',
      'Bill No. / Invoice',
      'Party Name',
      'Item Code',
      'Item Name',
      'Mill Name',
      'Weight (Kg)',
      'Unit',
      'Remarks',
    ],
  ];

  purchases.forEach((p, idx) => {
    purchaseRows.push([
      idx + 1,
      p.date,
      p.billNo,
      p.partyName || p.purchaseFrom || '',
      p.itemCode,
      p.itemName,
      p.millName,
      p.weight,
      p.unit || 'Kg',
      p.remarks || '',
    ]);
  });

  // 3. ISSUE (SLIPS)
  const issueRows: (string | number)[][] = [
    [
      'S.No.',
      'Date',
      'Bill No. / Slip',
      'Party Name',
      'Item Code',
      'Item Name',
      'Mill Name',
      'Weight (Kg)',
      'Unit',
      'Remarks',
    ],
  ];

  issues.forEach((iss, idx) => {
    issueRows.push([
      idx + 1,
      iss.date,
      iss.billNo,
      iss.partyName || iss.issueTo || '',
      iss.itemCode,
      iss.itemName,
      iss.millName,
      iss.weight,
      iss.unit || 'Kg',
      iss.remarks || '',
    ]);
  });

  // 4. ITEM MASTER
  const itemRows: (string | number)[][] = [
    [
      'S.No.',
      'Item Name',
      'Mill Name',
      'Item Code',
      'Unit',
      'Opening Stock',
      'Min Stock Alert',
      'Remarks',
    ],
  ];

  items.forEach((item, idx) => {
    itemRows.push([
      idx + 1,
      item.itemName,
      item.millName,
      item.itemCode,
      item.unit || 'Kg',
      item.openingStock || 0,
      item.minStockAlert || 0,
      item.remarks || '',
    ]);
  });

  return { reportRows, purchaseRows, issueRows, itemRows };
}

/**
 * Create a new Google Spreadsheet with all 4 sheets and formatted layout
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string,
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[],
  balances: StockBalanceItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  // 1. Create workbook with the 4 sheets
  const createPayload = {
    properties: {
      title: title || `Textile Stock Register ${new Date().toISOString().slice(0, 10)}`,
    },
    sheets: [
      {
        properties: {
          sheetId: 0,
          title: 'STOCK BALANCE REPORT',
          tabColor: { red: 0.1, green: 0.6, blue: 0.35 },
          gridProperties: { frozenRowCount: 4 },
        },
      },
      {
        properties: {
          sheetId: 1,
          title: 'PURCHASE (INVOICES)',
          tabColor: { red: 0.15, green: 0.45, blue: 0.85 },
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 2,
          title: 'ISSUE (SLIPS)',
          tabColor: { red: 0.85, green: 0.35, blue: 0.15 },
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 3,
          title: 'ITEM MASTER',
          tabColor: { red: 0.45, green: 0.25, blue: 0.75 },
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create Google Spreadsheet (${createRes.status})`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate values
  await exportToGoogleSpreadsheet(accessToken, spreadsheetId, items, purchases, issues, balances);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: createdData.properties?.title || title,
  };
}

/**
 * Export / Sync data to an existing Google Spreadsheet
 */
export async function exportToGoogleSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[],
  balances: StockBalanceItem[]
): Promise<void> {
  const { reportRows, purchaseRows, issueRows, itemRows } = buildSheetValues(items, purchases, issues, balances);

  // First, check which sheets currently exist in the destination spreadsheet
  const meta = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const existingSheets = new Set(meta.sheets);

  const neededSheets = [
    { title: 'STOCK BALANCE REPORT', tabColor: { red: 0.1, green: 0.6, blue: 0.35 } },
    { title: 'PURCHASE (INVOICES)', tabColor: { red: 0.15, green: 0.45, blue: 0.85 } },
    { title: 'ISSUE (SLIPS)', tabColor: { red: 0.85, green: 0.35, blue: 0.15 } },
    { title: 'ITEM MASTER', tabColor: { red: 0.45, green: 0.25, blue: 0.75 } },
  ];

  // Add missing sheets if not present
  const sheetsToAdd = neededSheets.filter(s => !existingSheets.has(s.title));
  if (sheetsToAdd.length > 0) {
    const addSheetRequests = sheetsToAdd.map(s => ({
      addSheet: {
        properties: {
          title: s.title,
          tabColor: s.tabColor,
        },
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });
  }

  // Clear previous data in target sheets to avoid leftover rows
  const clearPromises = [
    'STOCK BALANCE REPORT',
    'PURCHASE (INVOICES)',
    'ISSUE (SLIPS)',
    'ITEM MASTER',
  ].map(sheetName =>
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1:Z5000:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  );
  await Promise.all(clearPromises);

  // Write new values using batchUpdate
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'STOCK BALANCE REPORT'!A1",
        values: reportRows,
      },
      {
        range: "'PURCHASE (INVOICES)'!A1",
        values: purchaseRows,
      },
      {
        range: "'ISSUE (SLIPS)'!A1",
        values: issueRows,
      },
      {
        range: "'ITEM MASTER'!A1",
        values: itemRows,
      },
    ],
  };

  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to write values to Google Sheet (${updateRes.status})`);
  }
}

/**
 * Import records from an existing Google Spreadsheet into local state
 */
export async function importFromGoogleSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  items: ItemMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  stats: { itemsCount: number; purchasesCount: number; issuesCount: number };
}> {
  // 1. Discover all sheets in the spreadsheet
  const meta = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetNames = meta.sheets;

  // Find corresponding sheets
  const itemMasterSheetName = sheetNames.find(s => /item/i.test(s) || /master/i.test(s)) || sheetNames[0];
  const purchaseSheetName = sheetNames.find(s => /purch/i.test(s) || /in/i.test(s) || /buy/i.test(s));
  const issueSheetName = sheetNames.find(s => /issue/i.test(s) || /out/i.test(s) || /dispatch/i.test(s) || /sales/i.test(s));

  const rangesToFetch: string[] = [];
  if (itemMasterSheetName) rangesToFetch.push(`'${itemMasterSheetName}'!A1:Z500`);
  if (purchaseSheetName) rangesToFetch.push(`'${purchaseSheetName}'!A1:Z5000`);
  if (issueSheetName) rangesToFetch.push(`'${issueSheetName}'!A1:Z5000`);

  if (rangesToFetch.length === 0) {
    rangesToFetch.push(`'${sheetNames[0]}'!A1:Z5000`);
  }

  const queryRanges = rangesToFetch.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryRanges}`;

  const res = await fetch(batchGetUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read Google Sheet data (${res.status})`);
  }

  const data = await res.json();
  const valueRanges: any[] = data.valueRanges || [];

  const parsedItems: ItemMaster[] = [];
  const parsedPurchases: PurchaseRecord[] = [];
  const parsedIssues: IssueRecord[] = [];

  valueRanges.forEach((vr) => {
    const rangeName = vr.range || '';
    const values: (string | number)[][] = vr.values || [];
    if (values.length === 0) return;

    // Detect headers
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, values.length); i++) {
      const row = values[i];
      if (row.some(cell => /item|mill|code|bill|date|weight|supplier|party/i.test(String(cell)))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (values[headerRowIndex] || []).map(h => String(h).trim().toLowerCase());
    const dataRows = values.slice(headerRowIndex + 1);

    const isItemMaster = /item/i.test(rangeName) || /master/i.test(rangeName) || (headers.includes('item code') && !headers.includes('bill no.') && !headers.includes('date'));
    const isPurchase = /purch/i.test(rangeName) || headers.some(h => /purch|supplier|vendor|inward/i.test(h));
    const isIssue = /issue/i.test(rangeName) || headers.some(h => /issue|department|weaver|outward/i.test(h));

    if (isItemMaster) {
      const nameIdx = headers.findIndex(h => /item name|yarn count|item/i.test(h));
      const millIdx = headers.findIndex(h => /mill|company|brand|manufacturer/i.test(h));
      const codeIdx = headers.findIndex(h => /code|item code/i.test(h));
      const unitIdx = headers.findIndex(h => /unit|uom/i.test(h));
      const openIdx = headers.findIndex(h => /opening|open stock/i.test(h));
      const minIdx = headers.findIndex(h => /min|alert|reorder/i.test(h));
      const remIdx = headers.findIndex(h => /remark|notes/i.test(h));

      dataRows.forEach((row, rIdx) => {
        const rawName = nameIdx >= 0 ? String(row[nameIdx] || '') : '';
        const rawMill = millIdx >= 0 ? String(row[millIdx] || '') : '';
        const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '') : '';

        if (!rawName && !rawMill && !rawCode) return;

        const itemName = (rawName || (rawCode.includes('-') ? rawCode.split('-')[0] : rawCode) || `ITEM-${rIdx + 1}`).trim().toUpperCase();
        const millName = (rawMill || (rawCode.includes('-') ? rawCode.split('-').slice(1).join('-') : 'GENERAL')).trim().toUpperCase();
        const itemCode = (rawCode || formatItemCode(itemName, millName)).trim().toUpperCase();

        const unit = unitIdx >= 0 ? String(row[unitIdx] || 'Kg').trim() : 'Kg';
        const openingStock = openIdx >= 0 ? Number(String(row[openIdx]).replace(/,/g, '')) || 0 : 0;
        const minStockAlert = minIdx >= 0 ? Number(String(row[minIdx]).replace(/,/g, '')) || 0 : 0;
        const remarks = remIdx >= 0 ? String(row[remIdx] || '').trim() : '';

        // Avoid duplicates
        if (!parsedItems.some(it => it.itemCode === itemCode)) {
          parsedItems.push({
            id: `gitem-${Date.now()}-${rIdx}`,
            itemName,
            millName,
            itemCode,
            unit,
            openingStock,
            minStockAlert,
            remarks,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } else if (isPurchase) {
      const dateIdx = headers.findIndex(h => /date/i.test(h));
      const billIdx = headers.findIndex(h => /bill|invoice|challan|inv/i.test(h));
      const fromIdx = headers.findIndex(h => /purch|supplier|vendor|from|party/i.test(h));
      const codeIdx = headers.findIndex(h => /code/i.test(h));
      const nameIdx = headers.findIndex(h => /item name|item/i.test(h) && !/code/i.test(h));
      const millIdx = headers.findIndex(h => /mill/i.test(h));
      const weightIdx = headers.findIndex(h => /weight|qty|quantity|kg|in/i.test(h));
      const unitIdx = headers.findIndex(h => /unit|uom/i.test(h));
      const remIdx = headers.findIndex(h => /remark|notes/i.test(h));

      dataRows.forEach((row, rIdx) => {
        const rawDate = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
        const rawBill = billIdx >= 0 ? String(row[billIdx] || '').trim() : `PUR-${rIdx + 1}`;
        const rawParty = fromIdx >= 0 ? String(row[fromIdx] || '').trim() : 'Supplier';
        const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
        const rawName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
        const rawMill = millIdx >= 0 ? String(row[millIdx] || '').trim() : '';
        const rawWeight = weightIdx >= 0 ? Number(String(row[weightIdx]).replace(/,/g, '')) || 0 : 0;

        if (rawWeight <= 0 && !rawCode && !rawName) return;

        const itemName = (rawName || (rawCode.includes('-') ? rawCode.split('-')[0] : rawCode) || 'YARN').toUpperCase();
        const millName = (rawMill || (rawCode.includes('-') ? rawCode.split('-').slice(1).join('-') : 'GENERAL')).toUpperCase();
        const itemCode = (rawCode || formatItemCode(itemName, millName)).toUpperCase();

        parsedPurchases.push({
          id: `gpur-${Date.now()}-${rIdx}`,
          date: rawDate || new Date().toISOString().slice(0, 10),
          billNo: rawBill.toUpperCase(),
          partyName: rawParty,
          purchaseFrom: rawParty,
          itemCode,
          itemName,
          millName,
          weight: rawWeight,
          unit: unitIdx >= 0 ? String(row[unitIdx] || 'Kg').trim() : 'Kg',
          remarks: remIdx >= 0 ? String(row[remIdx] || '').trim() : '',
          createdAt: new Date().toISOString(),
        });
      });
    } else if (isIssue) {
      const dateIdx = headers.findIndex(h => /date/i.test(h));
      const billIdx = headers.findIndex(h => /bill|slip|challan|doc/i.test(h));
      const toIdx = headers.findIndex(h => /issue to|dept|weaver|to|customer|party/i.test(h));
      const codeIdx = headers.findIndex(h => /code/i.test(h));
      const nameIdx = headers.findIndex(h => /item name|item/i.test(h) && !/code/i.test(h));
      const millIdx = headers.findIndex(h => /mill/i.test(h));
      const weightIdx = headers.findIndex(h => /weight|qty|quantity|kg|out/i.test(h));
      const unitIdx = headers.findIndex(h => /unit|uom/i.test(h));
      const remIdx = headers.findIndex(h => /remark|notes/i.test(h));

      dataRows.forEach((row, rIdx) => {
        const rawDate = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
        const rawBill = billIdx >= 0 ? String(row[billIdx] || '').trim() : `ISS-${rIdx + 1}`;
        const rawParty = toIdx >= 0 ? String(row[toIdx] || '').trim() : 'Production Dept';
        const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
        const rawName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
        const rawMill = millIdx >= 0 ? String(row[millIdx] || '').trim() : '';
        const rawWeight = weightIdx >= 0 ? Number(String(row[weightIdx]).replace(/,/g, '')) || 0 : 0;

        if (rawWeight <= 0 && !rawCode && !rawName) return;

        const itemName = (rawName || (rawCode.includes('-') ? rawCode.split('-')[0] : rawCode) || 'YARN').toUpperCase();
        const millName = (rawMill || (rawCode.includes('-') ? rawCode.split('-').slice(1).join('-') : 'GENERAL')).toUpperCase();
        const itemCode = (rawCode || formatItemCode(itemName, millName)).toUpperCase();

        parsedIssues.push({
          id: `giss-${Date.now()}-${rIdx}`,
          date: rawDate || new Date().toISOString().slice(0, 10),
          billNo: rawBill.toUpperCase(),
          partyName: rawParty,
          issueTo: rawParty,
          itemCode,
          itemName,
          millName,
          weight: rawWeight,
          unit: unitIdx >= 0 ? String(row[unitIdx] || 'Kg').trim() : 'Kg',
          remarks: remIdx >= 0 ? String(row[remIdx] || '').trim() : '',
          createdAt: new Date().toISOString(),
        });
      });
    }
  });

  return {
    items: parsedItems,
    purchases: parsedPurchases,
    issues: parsedIssues,
    stats: {
      itemsCount: parsedItems.length,
      purchasesCount: parsedPurchases.length,
      issuesCount: parsedIssues.length,
    },
  };
}
