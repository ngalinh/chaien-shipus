'use strict';

console.log(`[startup] Node ${process.version} | pid ${process.pid} | ${new Date().toISOString()}`);

process.on('uncaughtException', (err) => {
  console.error('[crash] uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[crash] unhandledRejection:', reason);
  process.exit(1);
});

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

console.log('[startup] loading db...');
let db;
try {
  db = require('./db');
  console.log('[startup] db OK');
} catch (err) {
  console.error('[crash] db init failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure upload directories exist ─────────────────────────────────────────
['uploads', 'uploads/cccd', 'uploads/logo'].forEach((dir) => {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/shipments',    require('./routes/shipments'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// ─── Deploy webhook ──────────────────────────────────────────────────────────
const { exec } = require('child_process');
app.post('/deploy', express.raw({ type: '*/*' }), (req, res) => {
  const secret = process.env.DEPLOY_SECRET;
  if (secret && req.query.secret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ ok: true });
  console.log('[deploy] Starting git pull + rebuild...');
  exec(
    'git pull origin main && npm --prefix client install --include=dev && npm --prefix client run build && cp client/dist/index.html . && rm -rf assets && cp -r client/dist/assets .',
    { cwd: __dirname },
    (err) => {
      if (err) {
        console.error('[deploy] Failed:', err.message);
      } else {
        console.log('[deploy] Done, restarting...');
        process.exit(0);
      }
    }
  );
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
// Serve from repo root first (platform file-check), then client/dist as fallback
const rootIndex  = path.join(__dirname, 'index.html');
const clientDist = path.join(__dirname, 'client', 'dist');
const staticRoot = fs.existsSync(rootIndex) ? __dirname : clientDist;
console.log(`[startup] static root: ${staticRoot}`);
app.use(express.static(staticRoot));
app.get(/^(?!\/api).*/, (_req, res) => {
  const htmlFile = fs.existsSync(rootIndex)
    ? rootIndex
    : path.join(clientDist, 'index.html');
  res.sendFile(htmlFile);
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[startup] Chaien Shipus running on port ${PORT}`);
});

module.exports = app;
