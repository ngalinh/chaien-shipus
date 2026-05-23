'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');

const router = express.Router();

// ─── Multer config for company logo ──────────────────────────────────────────
const logoDir = path.join(__dirname, '..', 'uploads', 'logo');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/settings  — combined snapshot of all settings
// ═════════════════════════════════════════════════════════════════════════════
router.get('/', (_req, res) => {
  try {
    const rates        = db.prepare('SELECT * FROM customer_rates ORDER BY name').all();
    const warehouses   = db.prepare('SELECT * FROM partner_warehouses ORDER BY code').all();
    const bankAccounts = db.prepare('SELECT * FROM bank_accounts ORDER BY is_default DESC, bank_name').all();
    const companyRows  = db.prepare('SELECT key, value FROM company_info').all();
    const company      = Object.fromEntries(companyRows.map((r) => [r.key, r.value]));
    res.json({ rates, warehouses, bank_accounts: bankAccounts, company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Customer Rates
// ═════════════════════════════════════════════════════════════════════════════

router.get('/rates', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM customer_rates ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rates', (req, res) => {
  try {
    const { name, rate_per_kg } = req.body;
    if (!name || rate_per_kg == null) {
      return res.status(400).json({ error: 'name and rate_per_kg are required' });
    }
    const info = db.prepare(
      'INSERT INTO customer_rates (name, rate_per_kg) VALUES (?, ?)'
    ).run(name.trim(), parseFloat(rate_per_kg));
    const row = db.prepare('SELECT * FROM customer_rates WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/rates/:id', (req, res) => {
  try {
    const { name, rate_per_kg } = req.body;
    if (!name || rate_per_kg == null) {
      return res.status(400).json({ error: 'name and rate_per_kg are required' });
    }
    const info = db.prepare(
      'UPDATE customer_rates SET name = ?, rate_per_kg = ? WHERE id = ?'
    ).run(name.trim(), parseFloat(rate_per_kg), parseInt(req.params.id));
    if (info.changes === 0) return res.status(404).json({ error: 'Rate not found' });
    const row = db.prepare('SELECT * FROM customer_rates WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rates/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM customer_rates WHERE id = ?').run(parseInt(req.params.id));
    if (info.changes === 0) return res.status(404).json({ error: 'Rate not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Partner Warehouses
// ═════════════════════════════════════════════════════════════════════════════

router.get('/warehouses', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM partner_warehouses ORDER BY code').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/warehouses', (req, res) => {
  try {
    const { code, name, rate_per_kg } = req.body;
    if (!code || !name || rate_per_kg == null) {
      return res.status(400).json({ error: 'code, name and rate_per_kg are required' });
    }
    const info = db.prepare(
      'INSERT INTO partner_warehouses (code, name, rate_per_kg) VALUES (?, ?, ?)'
    ).run(code.trim().toUpperCase(), name.trim(), parseFloat(rate_per_kg));
    const row = db.prepare('SELECT * FROM partner_warehouses WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Warehouse code '${req.body.code}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/warehouses/:id', (req, res) => {
  try {
    const { code, name, rate_per_kg } = req.body;
    if (!code || !name || rate_per_kg == null) {
      return res.status(400).json({ error: 'code, name and rate_per_kg are required' });
    }
    const info = db.prepare(
      'UPDATE partner_warehouses SET code = ?, name = ?, rate_per_kg = ? WHERE id = ?'
    ).run(code.trim().toUpperCase(), name.trim(), parseFloat(rate_per_kg), parseInt(req.params.id));
    if (info.changes === 0) return res.status(404).json({ error: 'Warehouse not found' });
    const row = db.prepare('SELECT * FROM partner_warehouses WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Warehouse code '${req.body.code}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/warehouses/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM partner_warehouses WHERE id = ?').run(parseInt(req.params.id));
    if (info.changes === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Bank Accounts
// ═════════════════════════════════════════════════════════════════════════════

router.get('/bank-accounts', (_req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM bank_accounts ORDER BY is_default DESC, bank_name'
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bank-accounts', (req, res) => {
  try {
    const { bank_name, account_number, account_holder, is_default = 0 } = req.body;
    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({ error: 'bank_name, account_number and account_holder are required' });
    }
    const insertAndMaybeDefault = db.transaction(() => {
      if (parseInt(is_default)) {
        db.prepare('UPDATE bank_accounts SET is_default = 0').run();
      }
      const info = db.prepare(
        `INSERT INTO bank_accounts (bank_name, account_number, account_holder, is_default)
         VALUES (?, ?, ?, ?)`
      ).run(bank_name.trim(), account_number.trim(), account_holder.trim(), is_default ? 1 : 0);
      return db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(info.lastInsertRowid);
    });
    res.status(201).json(insertAndMaybeDefault());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bank-accounts/:id', (req, res) => {
  try {
    const { bank_name, account_number, account_holder, is_default } = req.body;
    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({ error: 'bank_name, account_number and account_holder are required' });
    }
    const updateAccount = db.transaction(() => {
      if (parseInt(is_default)) {
        db.prepare('UPDATE bank_accounts SET is_default = 0').run();
      }
      const info = db.prepare(
        `UPDATE bank_accounts SET bank_name = ?, account_number = ?, account_holder = ?, is_default = ?
         WHERE id = ?`
      ).run(
        bank_name.trim(),
        account_number.trim(),
        account_holder.trim(),
        is_default ? 1 : 0,
        parseInt(req.params.id)
      );
      return info.changes;
    });
    const changes = updateAccount();
    if (changes === 0) return res.status(404).json({ error: 'Bank account not found' });
    const row = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bank-accounts/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(parseInt(req.params.id));
    if (info.changes === 0) return res.status(404).json({ error: 'Bank account not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Company Info
// ═════════════════════════════════════════════════════════════════════════════

router.get('/company', (_req, res) => {
  try {
    const rows    = db.prepare('SELECT key, value FROM company_info').all();
    const company = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/company', (req, res) => {
  try {
    const { company_name, logo_path } = req.body;
    const upsert = db.prepare(
      `INSERT INTO company_info (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    const upsertMany = db.transaction((pairs) => {
      for (const [k, v] of pairs) {
        if (v !== undefined) upsert.run(k, v);
      }
    });
    upsertMany([
      ['company_name', company_name],
      ['logo_path',    logo_path],
    ]);
    const rows    = db.prepare('SELECT key, value FROM company_info').all();
    const company = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/company/logo
router.post('/company/logo', logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logoPath = `/uploads/logo/${req.file.filename}`;
    db.prepare(
      `INSERT INTO company_info (key, value) VALUES ('logo_path', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(logoPath);
    res.json({ logo_path: logoPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
