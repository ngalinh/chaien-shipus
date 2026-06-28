'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');

const router = express.Router();

// ─── Multer config for CCCD images ───────────────────────────────────────────
const cccdDir = path.join(__dirname, '..', 'uploads', 'cccd');
if (!fs.existsSync(cccdDir)) fs.mkdirSync(cccdDir, { recursive: true });

const cccdStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, cccdDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cccd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const cccdUpload = multer({
  storage: cccdStorage,
  limits:  { fileSize: 10 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// ─── Helper: compute customer activity status ─────────────────────────────────
function computeStatus(latestImportDate) {
  if (!latestImportDate) return 'Inactive';
  const diffMs   = Date.now() - new Date(latestImportDate).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 30)  return 'Active 1m';
  if (diffDays <= 60)  return 'Active 2m';
  if (diffDays <= 90)  return 'Active 3m';
  return 'Inactive';
}

// ─── Helper: attach status to a customer row ──────────────────────────────────
function withStatus(customer) {
  const row = db.prepare(
    `SELECT MAX(import_date) AS latest FROM shipments WHERE customer_id = ?`
  ).get(customer.id);
  return { ...customer, status: computeStatus(row ? row.latest : null) };
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/customers
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// POST /api/customers/import  — bulk import from parsed Excel rows
// ═════════════════════════════════════════════════════════════════════════════
router.post('/import', (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Không có dữ liệu' });
  }

  let imported = 0;
  let skipped  = 0;
  const rowErrors = [];

  try {
  const checkStmt  = db.prepare('SELECT id FROM customers WHERE code = ?');
  const insertStmt = db.prepare(`
    INSERT INTO customers (code, name, phone, email, address, channel, notes, warehouse)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    db.exec('BEGIN');
    for (const [i, row] of rows.entries()) {
      const code = (row.code || '').trim();
      const name = (row.name || '').trim();
      if (!code || !name) {
        rowErrors.push({ row: i + 2, error: 'Thiếu mã KH hoặc tên' });
        continue;
      }
      if (checkStmt.get(code)) {
        skipped++;
        continue;
      }
      try {
        insertStmt.run(
          code,
          name,
          row.phone     || null,
          row.email     || null,
          row.address   || null,
          row.channel   || null,
          row.notes     || null,
          row.warehouse || null,
        );
        imported++;
      } catch (err) {
        rowErrors.push({ row: i + 2, error: err.message });
      }
    }
    db.exec('COMMIT');
    res.json({ imported, skipped, errors: rowErrors });
  } catch (err) {
    console.error('[import error]', err.message, err.stack);
    try { db.exec('ROLLBACK'); } catch {}
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (_req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*, cr.name AS rate_name, cr.rate_per_kg,
             MAX(s.import_date) AS latest_shipment_date
      FROM customers c
      LEFT JOIN customer_rates cr ON cr.id = c.rate_id
      LEFT JOIN shipments s       ON s.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();

    const result = customers.map((c) => ({
      ...c,
      status: computeStatus(c.latest_shipment_date),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/customers
// ═════════════════════════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  try {
    const { code, name, phone, email, address, channel, notes, rate_id, warehouse } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    const info = db.prepare(`
      INSERT INTO customers (code, name, phone, email, address, channel, notes, rate_id, warehouse)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.trim(),
      name.trim(),
      phone     || null,
      email     || null,
      address   || null,
      channel   || null,
      notes     || null,
      rate_id   || null,
      warehouse || null,
    );
    const customer = db.prepare(`
      SELECT c.*, cr.name AS rate_name, cr.rate_per_kg
      FROM customers c
      LEFT JOIN customer_rates cr ON cr.id = c.rate_id
      WHERE c.id = ?
    `).get(info.lastInsertRowid);
    res.status(201).json({ ...customer, status: 'Inactive' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Customer code '${req.body.code}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/customers/:id
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare(`
      SELECT c.*, cr.name AS rate_name, cr.rate_per_kg
      FROM customers c
      LEFT JOIN customer_rates cr ON cr.id = c.rate_id
      WHERE c.id = ?
    `).get(parseInt(req.params.id));

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const images = db.prepare(
      'SELECT * FROM cccd_images WHERE customer_id = ? ORDER BY created_at'
    ).all(customer.id);

    // ── Financial stats ──────────────────────────────────────────────────────
    const statsRow = db.prepare(`
      SELECT
        COUNT(*)                                          AS shipped_count,
        COALESCE(SUM(weight), 0)                          AS total_kg,
        COALESCE(SUM(weight * customer_rate + surcharge), 0) AS total_vc_fee
      FROM shipments
      WHERE customer_id = ?
    `).get(customer.id);

    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(credit), 0) AS paid
      FROM transactions
      WHERE customer_id = ? AND reference_type = 'payment'
    `).get(customer.id);

    const totalVcFee = statsRow.total_vc_fee;
    const paid       = paidRow.paid;
    const remaining  = Math.max(0, totalVcFee - paid);

    // Pending: shipments not yet paid (simple proxy: total_vc_fee - paid)
    const pendingRow = db.prepare(`
      SELECT COUNT(*) AS pending_count
      FROM shipments s
      WHERE s.customer_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM batch_info bi
          WHERE bi.customer_id = s.customer_id
            AND bi.batch_date   = s.import_date
            AND bi.notified_at IS NOT NULL
        )
    `).get(customer.id);

    const latestDate = db.prepare(
      'SELECT MAX(import_date) AS latest FROM shipments WHERE customer_id = ?'
    ).get(customer.id);

    res.json({
      ...customer,
      status:        computeStatus(latestDate ? latestDate.latest : null),
      cccd_images:   images.map((img) => ({
        ...img,
        url: `/uploads/cccd/${img.filename}`,
      })),
      stats: {
        shipped_count: statsRow.shipped_count,
        pending_count: pendingRow.pending_count,
        total_kg:      statsRow.total_kg,
        total_vc_fee:  totalVcFee,
        paid,
        remaining,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/customers/:id
// ═════════════════════════════════════════════════════════════════════════════
router.put('/:id', (req, res) => {
  try {
    const { code, name, phone, email, address, channel, notes, rate_id, warehouse } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    const info = db.prepare(`
      UPDATE customers SET code = ?, name = ?, phone = ?, email = ?, address = ?, channel = ?, notes = ?, rate_id = ?, warehouse = ?
      WHERE id = ?
    `).run(
      code.trim(),
      name.trim(),
      phone     || null,
      email     || null,
      address   || null,
      channel   || null,
      notes     || null,
      rate_id   || null,
      warehouse || null,
      parseInt(req.params.id),
    );
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    const customer = db.prepare(`
      SELECT c.*, cr.name AS rate_name, cr.rate_per_kg
      FROM customers c
      LEFT JOIN customer_rates cr ON cr.id = c.rate_id
      WHERE c.id = ?
    `).get(req.params.id);
    res.json(withStatus(customer));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Customer code '${req.body.code}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/customers/:id
// ═════════════════════════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Delete CCCD files from disk before removing DB records
    const images = db.prepare('SELECT filename FROM cccd_images WHERE customer_id = ?').all(id);
    images.forEach(({ filename }) => {
      const filePath = path.join(__dirname, '..', 'uploads', 'cccd', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    const info = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/customers/:id/cccd  — upload CCCD images (max 2 total)
// ═════════════════════════════════════════════════════════════════════════════
router.post('/:id/cccd', (req, res) => {
  const id = parseInt(req.params.id);

  // Check customer exists first
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  cccdUpload.array('images', 2)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
      const existing = db.prepare(
        'SELECT COUNT(*) AS cnt FROM cccd_images WHERE customer_id = ?'
      ).get(id);
      const available = 2 - existing.cnt;

      if (available <= 0) {
        // Remove uploaded files and reject
        req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(409).json({ error: 'Maximum 2 CCCD images already uploaded. Delete one first.' });
      }

      const toInsert = req.files.slice(0, available);
      const rejected = req.files.slice(available);

      // Remove excess files from disk
      rejected.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));

      const insertStmt = db.prepare(
        'INSERT INTO cccd_images (customer_id, filename, original_name) VALUES (?, ?, ?)'
      );
      const insertAll = db.transaction((files) => {
        return files.map((f) => {
          const info = insertStmt.run(id, f.filename, f.originalname);
          return db.prepare('SELECT * FROM cccd_images WHERE id = ?').get(info.lastInsertRowid);
        });
      });

      const inserted = insertAll(toInsert).map((img) => ({
        ...img,
        url: `/uploads/cccd/${img.filename}`,
      }));

      res.status(201).json({
        inserted,
        warnings: rejected.length > 0
          ? [`${rejected.length} file(s) ignored (2-image limit)`]
          : [],
      });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/customers/:id/cccd/:imgId
// ═════════════════════════════════════════════════════════════════════════════
router.delete('/:id/cccd/:imgId', (req, res) => {
  try {
    const id    = parseInt(req.params.id);
    const imgId = parseInt(req.params.imgId);

    const img = db.prepare(
      'SELECT * FROM cccd_images WHERE id = ? AND customer_id = ?'
    ).get(imgId, id);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    const filePath = path.join(__dirname, '..', 'uploads', 'cccd', img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM cccd_images WHERE id = ?').run(imgId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
