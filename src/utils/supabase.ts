import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ItemMaster, PurchaseRecord, IssueRecord, PartyMaster } from '../types';

const STORAGE_KEY_SUPABASE_URL = 'stock_record_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'stock_record_supabase_anon_key';

export const DEFAULT_SUPABASE_CONFIG = {
  projectName: 'YARNSTOCK',
  projectId: 'hirwerrvnepnitbwusec',
  url: 'https://hirwerrvnepnitbwusec.supabase.co',
  anonKey: 'sb_publishable_fk41GPWYGzKxrDjqN5NU4A_xR2cI8ny',
};

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing /rest/v1 or /rest/v1/
  url = url.replace(/\/rest\/v1\/?$/i, '');
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
}

export function getSupabaseCredentials(): {
  url: string;
  key: string;
  projectName: string;
  projectId: string;
} {
  // Check environment variables first (standard convention)
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return {
      url: normalizeSupabaseUrl(envUrl),
      key: envKey.trim(),
      projectName: DEFAULT_SUPABASE_CONFIG.projectName,
      projectId: DEFAULT_SUPABASE_CONFIG.projectId,
    };
  }

  // Fallback to locally saved credentials (if user configured via UI dialog)
  try {
    const savedUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL);
    const savedKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY);
    if (savedUrl && savedKey) {
      return {
        url: normalizeSupabaseUrl(savedUrl),
        key: savedKey.trim(),
        projectName: DEFAULT_SUPABASE_CONFIG.projectName,
        projectId: DEFAULT_SUPABASE_CONFIG.projectId,
      };
    }
  } catch {
    // ignore
  }

  // Fallback to configured project defaults
  return {
    url: normalizeSupabaseUrl(DEFAULT_SUPABASE_CONFIG.url),
    key: DEFAULT_SUPABASE_CONFIG.anonKey,
    projectName: DEFAULT_SUPABASE_CONFIG.projectName,
    projectId: DEFAULT_SUPABASE_CONFIG.projectId,
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  try {
    if (url && key) {
      localStorage.setItem(STORAGE_KEY_SUPABASE_URL, normalizeSupabaseUrl(url));
      localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
      localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    }
    // Invalidate cached client
    cachedClient = null;
  } catch (err) {
    console.error('Failed to save Supabase credentials:', err);
  }
}

export function resetSupabaseCredentialsToDefault() {
  try {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    cachedClient = null;
  } catch (err) {
    console.error('Failed to reset Supabase credentials:', err);
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}

// SQL Schema for users to run in Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- STOCK RECORD & INVENTORY SYSTEM - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase Project -> SQL Editor
-- ========================================================

-- 1. Parties Master Table
create table if not exists public.parties (
  id text primary key,
  party_name text not null unique,
  party_type text default 'Both',
  contact_person text default '',
  phone text default '',
  city text default '',
  address text default '',
  gstin text default '',
  remarks text default '',
  created_at timestamptz default now()
);

-- 2. Items Master Table
create table if not exists public.items (
  id text primary key,
  item_name text not null,
  mill_name text not null,
  item_code text not null unique,
  unit text default 'Kg',
  min_stock_alert numeric default 0,
  opening_stock numeric default 0,
  remarks text default '',
  created_at timestamptz default now()
);

-- 3. Purchases Table (Inward Stock)
create table if not exists public.purchases (
  id text primary key,
  date text not null,
  bill_no text not null,
  party_name text not null,
  item_code text not null,
  item_name text not null,
  mill_name text not null,
  weight numeric not null default 0,
  unit text default 'Kg',
  remarks text default '',
  created_at timestamptz default now()
);

-- 4. Issues Table (Outward Stock)
create table if not exists public.issues (
  id text primary key,
  date text not null,
  bill_no text not null,
  party_name text not null,
  item_code text not null,
  item_name text not null,
  mill_name text not null,
  weight numeric not null default 0,
  unit text default 'Kg',
  remarks text default '',
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.parties enable row level security;
alter table public.items enable row level security;
alter table public.purchases enable row level security;
alter table public.issues enable row level security;

-- Policies to allow read & write via client anon key
drop policy if exists "Allow anon full access on parties" on public.parties;
create policy "Allow anon full access on parties" on public.parties for all using (true) with check (true);

drop policy if exists "Allow anon full access on items" on public.items;
create policy "Allow anon full access on items" on public.items for all using (true) with check (true);

drop policy if exists "Allow anon full access on purchases" on public.purchases;
create policy "Allow anon full access on purchases" on public.purchases for all using (true) with check (true);

drop policy if exists "Allow anon full access on issues" on public.issues;
create policy "Allow anon full access on issues" on public.issues for all using (true) with check (true);

-- Enable Realtime publication for all tables
alter publication supabase_realtime add table public.parties;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.purchases;
alter publication supabase_realtime add table public.issues;
`;

// Test connectivity and check if tables exist
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesExist?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are missing.',
    };
  }

  try {
    const { error } = await client.from('items').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          tablesExist: false,
          message: 'Connected to Supabase! However, the database tables are not created yet. Please execute the SQL schema in the Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Database error: ${error.message} (${error.code || 'ERR'})`,
      };
    }
    return {
      success: true,
      tablesExist: true,
      message: 'Connected successfully to Supabase! All tables are accessible.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to connect to Supabase.',
    };
  }
}

// Fetch all dataset from Supabase
export async function fetchAllFromSupabase(): Promise<{
  parties: PartyMaster[];
  items: ItemMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [partiesRes, itemsRes, purRes, issRes] = await Promise.all([
      client.from('parties').select('*').order('party_name'),
      client.from('items').select('*').order('item_code'),
      client.from('purchases').select('*').order('date', { ascending: false }),
      client.from('issues').select('*').order('date', { ascending: false }),
    ]);

    if (partiesRes.error && !partiesRes.error.message.includes('does not exist')) {
      console.warn('Error fetching parties from Supabase:', partiesRes.error);
    }
    if (itemsRes.error && !itemsRes.error.message.includes('does not exist')) {
      console.warn('Error fetching items from Supabase:', itemsRes.error);
    }

    const parties: PartyMaster[] = (partiesRes.data || []).map((row: any) => ({
      id: row.id,
      partyName: row.party_name,
      partyType: row.party_type,
      contactPerson: row.contact_person || '',
      phone: row.phone || '',
      city: row.city || '',
      address: row.address || '',
      gstin: row.gstin || '',
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    const items: ItemMaster[] = (itemsRes.data || []).map((row: any) => ({
      id: row.id,
      itemName: row.item_name,
      millName: row.mill_name,
      itemCode: row.item_code,
      unit: row.unit || 'Kg',
      minStockAlert: Number(row.min_stock_alert) || 0,
      openingStock: Number(row.opening_stock) || 0,
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    const purchases: PurchaseRecord[] = (purRes.data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      billNo: row.bill_no,
      partyName: row.party_name,
      purchaseFrom: row.party_name,
      itemCode: row.item_code,
      itemName: row.item_name,
      millName: row.mill_name,
      weight: Number(row.weight) || 0,
      unit: row.unit || 'Kg',
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    const issues: IssueRecord[] = (issRes.data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      billNo: row.bill_no,
      partyName: row.party_name,
      issueTo: row.party_name,
      itemCode: row.item_code,
      itemName: row.item_name,
      millName: row.mill_name,
      weight: Number(row.weight) || 0,
      unit: row.unit || 'Kg',
      remarks: row.remarks || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return { parties, items, purchases, issues };
  } catch (err) {
    console.error('Error fetching all data from Supabase:', err);
    return null;
  }
}

// Push entire dataset to Supabase
export async function pushAllToSupabase(
  parties: PartyMaster[],
  items: ItemMaster[],
  purchases: PurchaseRecord[],
  issues: IssueRecord[]
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured.' };
  }

  try {
    // 1. Parties
    if (parties.length > 0) {
      const partyRows = parties.map(p => ({
        id: p.id,
        party_name: p.partyName,
        party_type: p.partyType || 'Both',
        contact_person: p.contactPerson || '',
        phone: p.phone || '',
        city: p.city || '',
        address: p.address || '',
        gstin: p.gstin || '',
        remarks: p.remarks || '',
        created_at: p.createdAt || new Date().toISOString(),
      }));
      const { error: pErr } = await client.from('parties').upsert(partyRows, { onConflict: 'id' });
      if (pErr) throw new Error(`Parties upsert failed: ${pErr.message}`);
    }

    // 2. Items
    if (items.length > 0) {
      const itemRows = items.map(i => ({
        id: i.id,
        item_name: i.itemName,
        mill_name: i.millName,
        item_code: i.itemCode,
        unit: i.unit || 'Kg',
        min_stock_alert: i.minStockAlert || 0,
        opening_stock: i.openingStock || 0,
        remarks: i.remarks || '',
        created_at: i.createdAt || new Date().toISOString(),
      }));
      const { error: iErr } = await client.from('items').upsert(itemRows, { onConflict: 'id' });
      if (iErr) throw new Error(`Items upsert failed: ${iErr.message}`);
    }

    // 3. Purchases
    if (purchases.length > 0) {
      const purRows = purchases.map(p => ({
        id: p.id,
        date: p.date,
        bill_no: p.billNo,
        party_name: p.partyName || p.purchaseFrom || '',
        item_code: p.itemCode,
        item_name: p.itemName,
        mill_name: p.millName,
        weight: p.weight,
        unit: p.unit || 'Kg',
        remarks: p.remarks || '',
        created_at: p.createdAt || new Date().toISOString(),
      }));
      const { error: purErr } = await client.from('purchases').upsert(purRows, { onConflict: 'id' });
      if (purErr) throw new Error(`Purchases upsert failed: ${purErr.message}`);
    }

    // 4. Issues
    if (issues.length > 0) {
      const issRows = issues.map(i => ({
        id: i.id,
        date: i.date,
        bill_no: i.billNo,
        party_name: i.partyName || i.issueTo || '',
        item_code: i.itemCode,
        item_name: i.itemName,
        mill_name: i.millName,
        weight: i.weight,
        unit: i.unit || 'Kg',
        remarks: i.remarks || '',
        created_at: i.createdAt || new Date().toISOString(),
      }));
      const { error: issErr } = await client.from('issues').upsert(issRows, { onConflict: 'id' });
      if (issErr) throw new Error(`Issues upsert failed: ${issErr.message}`);
    }

    return {
      success: true,
      message: `Successfully synchronized ${parties.length} parties, ${items.length} items, ${purchases.length} purchases, and ${issues.length} issues to Supabase!`,
    };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync data to Supabase.',
    };
  }
}

// Granular Upsert & Delete operations for real-time syncing as users edit
export async function supabaseSaveParty(p: PartyMaster) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('parties').upsert({
      id: p.id,
      party_name: p.partyName,
      party_type: p.partyType || 'Both',
      contact_person: p.contactPerson || '',
      phone: p.phone || '',
      city: p.city || '',
      address: p.address || '',
      gstin: p.gstin || '',
      remarks: p.remarks || '',
      created_at: p.createdAt || new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase party upsert error:', err);
  }
}

export async function supabaseDeleteParty(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('parties').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase party delete error:', err);
  }
}

export async function supabaseSaveItem(i: ItemMaster) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('items').upsert({
      id: i.id,
      item_name: i.itemName,
      mill_name: i.millName,
      item_code: i.itemCode,
      unit: i.unit || 'Kg',
      min_stock_alert: i.minStockAlert || 0,
      opening_stock: i.openingStock || 0,
      remarks: i.remarks || '',
      created_at: i.createdAt || new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase item upsert error:', err);
  }
}

export async function supabaseDeleteItem(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('items').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase item delete error:', err);
  }
}

export async function supabaseSavePurchase(p: PurchaseRecord) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('purchases').upsert({
      id: p.id,
      date: p.date,
      bill_no: p.billNo,
      party_name: p.partyName || p.purchaseFrom || '',
      item_code: p.itemCode,
      item_name: p.itemName,
      mill_name: p.millName,
      weight: p.weight,
      unit: p.unit || 'Kg',
      remarks: p.remarks || '',
      created_at: p.createdAt || new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase purchase upsert error:', err);
  }
}

export async function supabaseDeletePurchase(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('purchases').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase purchase delete error:', err);
  }
}

export async function supabaseSaveIssue(i: IssueRecord) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('issues').upsert({
      id: i.id,
      date: i.date,
      bill_no: i.billNo,
      party_name: i.partyName || i.issueTo || '',
      item_code: i.itemCode,
      item_name: i.itemName,
      mill_name: i.millName,
      weight: i.weight,
      unit: i.unit || 'Kg',
      remarks: i.remarks || '',
      created_at: i.createdAt || new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase issue upsert error:', err);
  }
}

export async function supabaseDeleteIssue(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('issues').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase issue delete error:', err);
  }
}

// Real-time changes listener
export function subscribeToSupabaseChanges(onRemoteChange: () => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      onRemoteChange();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
