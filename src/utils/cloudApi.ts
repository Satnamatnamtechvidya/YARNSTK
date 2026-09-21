import { ItemMaster, PartyMaster, PurchaseRecord, IssueRecord } from '../types';

export interface CloudStockData {
  items: ItemMaster[];
  parties: PartyMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  lastModified: number;
}

export async function fetchCloudStockData(): Promise<CloudStockData | null> {
  try {
    const res = await fetch('/api/stock/data', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) {
      console.warn('Failed to fetch stock data from cloud API:', res.status);
      return null;
    }
    const json = await res.json();
    return {
      items: Array.isArray(json.items) ? json.items : [],
      parties: Array.isArray(json.parties) ? json.parties : [],
      purchases: Array.isArray(json.purchases) ? json.purchases : [],
      issues: Array.isArray(json.issues) ? json.issues : [],
      lastModified: typeof json.lastModified === 'number' ? json.lastModified : Date.now(),
    };
  } catch (err) {
    console.error('Error fetching cloud stock data:', err);
    return null;
  }
}

export async function syncAllToCloud(data: {
  items: ItemMaster[];
  parties: PartyMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
}): Promise<boolean> {
  try {
    const res = await fetch('/api/stock/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to sync data to cloud API:', err);
    return false;
  }
}

export async function cloudSavePurchase(p: PurchaseRecord): Promise<void> {
  try {
    await fetch('/api/stock/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
  } catch (err) {
    console.error('Failed to save purchase to cloud:', err);
  }
}

export async function cloudDeletePurchase(id: string): Promise<void> {
  try {
    await fetch(`/api/stock/purchase/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to delete purchase from cloud:', err);
  }
}

export async function cloudSaveIssue(i: IssueRecord): Promise<void> {
  try {
    await fetch('/api/stock/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(i),
    });
  } catch (err) {
    console.error('Failed to save issue to cloud:', err);
  }
}

export async function cloudDeleteIssue(id: string): Promise<void> {
  try {
    await fetch(`/api/stock/issue/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to delete issue from cloud:', err);
  }
}

export async function cloudSaveItem(item: ItemMaster): Promise<void> {
  try {
    await fetch('/api/stock/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.error('Failed to save item to cloud:', err);
  }
}

export async function cloudDeleteItem(id: string): Promise<void> {
  try {
    await fetch(`/api/stock/item/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to delete item from cloud:', err);
  }
}

export async function cloudSaveParty(party: PartyMaster): Promise<void> {
  try {
    await fetch('/api/stock/party', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(party),
    });
  } catch (err) {
    console.error('Failed to save party to cloud:', err);
  }
}

export async function cloudDeleteParty(id: string): Promise<void> {
  try {
    await fetch(`/api/stock/party/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Failed to delete party from cloud:', err);
  }
}

export async function cloudResetAll(): Promise<void> {
  try {
    await fetch('/api/stock/reset', {
      method: 'POST',
    });
  } catch (err) {
    console.error('Failed to reset cloud database:', err);
  }
}

/**
 * Periodically checks if server database was updated by another user or system.
 */
export function startCloudPolling(
  getLastModified: () => number,
  onRemoteUpdate: (data: CloudStockData) => void,
  intervalMs = 4000
) {
  let isChecking = false;

  const interval = setInterval(async () => {
    if (isChecking || document.hidden) return;
    isChecking = true;

    try {
      const res = await fetch('/api/stock/status', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        const localLastMod = getLastModified();
        if (json.lastModified && json.lastModified > localLastMod) {
          // Fetch full updated data
          const fullData = await fetchCloudStockData();
          if (fullData) {
            onRemoteUpdate(fullData);
          }
        }
      }
    } catch {
      // Network hiccup - ignore silently
    } finally {
      isChecking = false;
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
