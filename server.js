'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// Initialise DB (runs migrations on first import)
require('./db');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure upload directories exist ─────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
['uploads', 'uploads/cccd', 'uploads/logo'].forEach((dir) => {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/shipments',    require('./routes/shipments'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Chaien Shipus server running on http://localhost:${PORT}`);
});

module.exports = app;
