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
const crypto  = require('crypto');

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
// Restrict CORS to the known BASSO frontend origin(s). Falls back to same-origin
// only if ALLOWED_ORIGIN is unset (the app is served from the same origin anyway).
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://ai.basso.vn';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Basic Auth gate ─────────────────────────────────────────────────────
// The whole app (SPA, API, and uploaded files incl. sensitive CCCD images) is
// served by this Express process, so a single Basic-auth gate protects everything.
// The browser prompts once on first load and replays the credential on every
// request — no login UI or frontend change needed.
// Disabled automatically when AUTH_USER/AUTH_PASS are unset (e.g. local dev),
// so a missing env never locks the app out; set both in the VPS .env to enable.
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

if (AUTH_USER && AUTH_PASS) {
  app.use((req, res, next) => {
    // The deploy webhook authenticates with its own token — let it through.
    if (req.path === '/deploy') return next();

    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
      if (safeEqual(user, AUTH_USER) && safeEqual(pass, AUTH_PASS)) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="ShipUS", charset="UTF-8"');
    return res.status(401).send('Authentication required');
  });
  console.log('[startup] Basic auth ENABLED');
} else {
  console.log('[startup] Basic auth disabled (AUTH_USER/AUTH_PASS not set)');
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
// API responses must never be cached by the browser — otherwise a freshly
// created/edited customer, rate, etc. can stay stale (e.g. missing from the
// import dropdown) until the heuristic cache expires.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/api/settings',     require('./routes/settings'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/shipments',    require('./routes/shipments'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// ─── Deploy webhook ──────────────────────────────────────────────────────────
const { exec } = require('child_process');
app.post('/deploy', express.raw({ type: '*/*' }), (req, res) => {
  const token = req.headers['x-deploy-token'];
  if (!token || !process.env.DEPLOY_TOKEN || !safeEqual(token, process.env.DEPLOY_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ ok: true });
  console.log('[deploy] Starting git pull + rebuild...');
  exec(
    'git pull origin main && npm --prefix client install --include=dev && npm --prefix client run build && cp client/dist/index.html . && rm -rf assets && cp -r client/dist/assets .',
    { cwd: __dirname },
    (err) => {
      if (err) { console.error('[deploy] Failed:', err.message); }
      else { console.log('[deploy] Done, restarting...'); process.exit(0); }
    }
  );
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
// Serve from repo root first (platform file-check), then client/dist as fallback
const rootIndex  = path.join(__dirname, 'index.html');
const clientDist = path.join(__dirname, 'client', 'dist');
const staticRoot = fs.existsSync(rootIndex) ? __dirname : clientDist;
console.log(`[startup] static root: ${staticRoot}`);
app.use(express.static(staticRoot, {
  setHeaders: (res, filePath) => {
    // Content-hashed assets are immutable → cache long. index.html must never
    // be cached so a new deploy is picked up immediately (no stale bundle refs).
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get(/^(?!\/api).*/, (_req, res) => {
  const htmlFile = fs.existsSync(rootIndex)
    ? rootIndex
    : path.join(clientDist, 'index.html');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(htmlFile);
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Log full details server-side, but never leak internal error strings (SQLite
// messages, stack traces) to the client on unexpected 500s. Client-facing 4xx
// validation errors set their own status and are passed through as-is.
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? (err.message || 'Bad request') : 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[startup] Chaien Shipus running on port ${PORT}`);
});

module.exports = app;
