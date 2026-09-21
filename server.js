import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { handleStockApi, initStockDb } from './server/stockApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

// Initialize database
initStockDb();

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const buildReady = fs.existsSync(INDEX_FILE);
  res.status(buildReady ? 200 : 503).json({
    status: buildReady ? 'ok' : 'building',
    nodeVersion: process.version,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Central Stock & Inventory REST API for multi-device synchronization
app.use('/api/stock', (req, res) => {
  handleStockApi(req, res);
});

// Serve static assets produced by Vite build if available
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1d',
    index: false // Let explicit fallback route handle index.html
  }));
}

// SPA fallback: Route all frontend navigation to index.html
app.get('*', (req, res) => {
  if (fs.existsSync(INDEX_FILE)) {
    res.sendFile(INDEX_FILE);
  } else {
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>App Initializing - Build Pending</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
          h2 { margin-top: 0; color: #38bdf8; font-size: 20px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          code { background: #0f172a; padding: 3px 8px; border-radius: 4px; color: #a5f3fc; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Application Initializing</h2>
          <p>The frontend bundle is not yet compiled in <code>dist/</code>.</p>
          <p>In your Hostinger deployment settings, ensure the <strong>Build command</strong> is set to <code>npm run build</code>.</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

