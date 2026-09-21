import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'stock_db.json');

// Ensure database file and directory exist
export function initStockDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        {
          items: [],
          parties: [],
          purchases: [],
          issues: [],
          lastModified: Date.now(),
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

export function readStockDb() {
  initStockDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      lastModified: parsed.lastModified || Date.now(),
    };
  } catch (err) {
    console.error('Error reading stock DB:', err);
    return {
      items: [],
      parties: [],
      purchases: [],
      issues: [],
      lastModified: Date.now(),
    };
  }
}

export function writeStockDb(data) {
  initStockDb();
  const payload = {
    items: Array.isArray(data.items) ? data.items : [],
    parties: Array.isArray(data.parties) ? data.parties : [],
    purchases: Array.isArray(data.purchases) ? data.purchases : [],
    issues: Array.isArray(data.issues) ? data.issues : [],
    lastModified: Date.now(),
  };

  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return payload;
  } catch (err) {
    console.error('Error writing stock DB:', err);
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
    throw err;
  }
}

/**
 * Handle incoming stock API requests
 * Works with both Express req/res and Vite dev server connect middlewares
 */
export async function handleStockApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // Helper to read JSON body
  const readBody = () =>
    new Promise((resolve) => {
      if (req.body && typeof req.body === 'object') {
        resolve(req.body);
        return;
      }
      let bodyStr = '';
      req.on('data', (chunk) => {
        bodyStr += chunk;
      });
      req.on('end', () => {
        try {
          resolve(bodyStr ? JSON.parse(bodyStr) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });

  const sendJson = (status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(JSON.stringify(obj));
  };

  try {
    // 1. GET /api/stock/data or /api/stock/status
    if (pathname === '/api/stock/data' && method === 'GET') {
      const db = readStockDb();
      return sendJson(200, db);
    }

    if (pathname === '/api/stock/status' && method === 'GET') {
      const db = readStockDb();
      return sendJson(200, {
        status: 'ok',
        lastModified: db.lastModified,
        counts: {
          items: db.items.length,
          parties: db.parties.length,
          purchases: db.purchases.length,
          issues: db.issues.length,
        },
      });
    }

    // 2. POST /api/stock/sync - full synchronization / push
    if (pathname === '/api/stock/sync' && method === 'POST') {
      const body = await readBody();
      const current = readStockDb();

      // Merge items
      const itemMap = new Map(current.items.map((i) => [i.id, i]));
      (body.items || []).forEach((i) => itemMap.set(i.id, i));

      // Merge parties
      const partyMap = new Map(current.parties.map((p) => [p.id, p]));
      (body.parties || []).forEach((p) => partyMap.set(p.id, p));

      // Merge purchases
      const purMap = new Map(current.purchases.map((p) => [p.id, p]));
      (body.purchases || []).forEach((p) => purMap.set(p.id, p));

      // Merge issues
      const issMap = new Map(current.issues.map((i) => [i.id, i]));
      (body.issues || []).forEach((i) => issMap.set(i.id, i));

      const updated = writeStockDb({
        items: Array.from(itemMap.values()),
        parties: Array.from(partyMap.values()),
        purchases: Array.from(purMap.values()),
        issues: Array.from(issMap.values()),
      });

      return sendJson(200, {
        success: true,
        lastModified: updated.lastModified,
        data: updated,
      });
    }

    // 3. POST /api/stock/purchase - add/update purchase
    if (pathname === '/api/stock/purchase' && method === 'POST') {
      const record = await readBody();
      if (!record || !record.id) {
        return sendJson(400, { error: 'Invalid purchase record data' });
      }
      const db = readStockDb();
      const existingIdx = db.purchases.findIndex((p) => p.id === record.id);
      if (existingIdx >= 0) {
        db.purchases[existingIdx] = { ...db.purchases[existingIdx], ...record };
      } else {
        db.purchases.unshift(record);
      }
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, record, lastModified: updated.lastModified });
    }

    // 4. DELETE /api/stock/purchase/:id
    if (pathname.startsWith('/api/stock/purchase/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/stock/purchase/', ''));
      const db = readStockDb();
      db.purchases = db.purchases.filter((p) => p.id !== id);
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, id, lastModified: updated.lastModified });
    }

    // 5. POST /api/stock/issue - add/update issue
    if (pathname === '/api/stock/issue' && method === 'POST') {
      const record = await readBody();
      if (!record || !record.id) {
        return sendJson(400, { error: 'Invalid issue record data' });
      }
      const db = readStockDb();
      const existingIdx = db.issues.findIndex((i) => i.id === record.id);
      if (existingIdx >= 0) {
        db.issues[existingIdx] = { ...db.issues[existingIdx], ...record };
      } else {
        db.issues.unshift(record);
      }
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, record, lastModified: updated.lastModified });
    }

    // 6. DELETE /api/stock/issue/:id
    if (pathname.startsWith('/api/stock/issue/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/stock/issue/', ''));
      const db = readStockDb();
      db.issues = db.issues.filter((i) => i.id !== id);
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, id, lastModified: updated.lastModified });
    }

    // 7. POST /api/stock/item - add/update item master
    if (pathname === '/api/stock/item' && method === 'POST') {
      const item = await readBody();
      if (!item || !item.id) {
        return sendJson(400, { error: 'Invalid item data' });
      }
      const db = readStockDb();
      const existingIdx = db.items.findIndex((i) => i.id === item.id);
      if (existingIdx >= 0) {
        db.items[existingIdx] = { ...db.items[existingIdx], ...item };
      } else {
        db.items.unshift(item);
      }
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, item, lastModified: updated.lastModified });
    }

    // 8. DELETE /api/stock/item/:id
    if (pathname.startsWith('/api/stock/item/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/stock/item/', ''));
      const db = readStockDb();
      db.items = db.items.filter((i) => i.id !== id);
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, id, lastModified: updated.lastModified });
    }

    // 9. POST /api/stock/party - add/update party master
    if (pathname === '/api/stock/party' && method === 'POST') {
      const party = await readBody();
      if (!party || !party.id) {
        return sendJson(400, { error: 'Invalid party data' });
      }
      const db = readStockDb();
      const existingIdx = db.parties.findIndex((p) => p.id === party.id);
      if (existingIdx >= 0) {
        db.parties[existingIdx] = { ...db.parties[existingIdx], ...party };
      } else {
        db.parties.unshift(party);
      }
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, party, lastModified: updated.lastModified });
    }

    // 10. DELETE /api/stock/party/:id
    if (pathname.startsWith('/api/stock/party/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/stock/party/', ''));
      const db = readStockDb();
      db.parties = db.parties.filter((p) => p.id !== id);
      const updated = writeStockDb(db);
      return sendJson(200, { success: true, id, lastModified: updated.lastModified });
    }

    // 11. POST /api/stock/reset - reset database
    if (pathname === '/api/stock/reset' && method === 'POST') {
      const updated = writeStockDb({
        items: [],
        parties: [],
        purchases: [],
        issues: [],
      });
      return sendJson(200, { success: true, message: 'Stock database cleared successfully.', lastModified: updated.lastModified });
    }

    return sendJson(404, { error: `Endpoint ${pathname} not found` });
  } catch (err) {
    console.error(`Error in stock API [${method} ${pathname}]:`, err);
    return sendJson(500, { error: 'Internal Server Error', message: err.message });
  }
}
