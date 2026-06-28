'use strict';

const express = require('express');
const db      = require('../db');

const router = express.Router();

// ─── Helper: today as YYYY-MM-DD in Vietnam local time ───────────────────────
function todayStr() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ─── Helper: trigger auto-debit for a (date, customer_id) batch ───────────────
// Called after shipment import.  Lives here so shipments and transactions routes
// can share it without circular deps.
function triggerAutoDebit(importDate, customerId) {
  const feeRow = db.prepare(`
    SELECT COALESCE(SUM(weight * customer_rate + surcharge), 0) AS total_vc_fee,
           COUNT(*) AS cnt
    FROM shipments
    WHERE import_date = ? AND customer_id = ?
  `).get(importDate, customerId);

  const fee   = feeRow ? feeRow.total_vc_fee : 0;
  const refId = String(importDate + '_' + customerId);

  const existing = db.prepare(`
    SELECT id FROM transactions
    WHERE customer_id = ? AND trans_date = ? AND reference_type = 'shipment_batch'
      AND reference_id = ?
  `).get(customerId, importDate, refId);

  if (existing) {
    // Always update (even to 0) so deleted shipments don't leave stale debits
    db.prepare(`UPDATE transactions SET debit = ?, description = ? WHERE id = ?`)
      .run(fee, `Phí VC lô ${importDate}`, existing.id);
  } else if (fee > 0) {
    db.prepare(`
      INSERT INTO transactions (trans_date, customer_id, description, debit, credit, reference_type, reference_id)
      VALUES (?, ?, ?, ?, 0, 'shipment_batch', ?)
    `).run(importDate, customerId, `Phí VC lô ${importDate}`, fee, refId);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/shipments
// Query params: start_date, end_date, customer_id, warehouse_id
// ═════════════════════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  try {
    const { start_date, end_date, customer_id, warehouse_id } = req.query;

    const conditions = [];
    const params     = [];

    if (start_date) { conditions.push('s.import_date >= ?'); params.push(start_date); }
    if (end_date)   { conditions.push('s.import_date <= ?'); params.push(end_date);   }
    if (customer_id)  { conditions.push('s.customer_id = ?');  params.push(parseInt(customer_id));  }
    if (warehouse_id) { conditions.push('s.warehouse_id = ?'); params.push(parseInt(warehouse_id)); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = db.prepare(`
      SELECT s.*,
             c.name  AS customer_name,
             c.code  AS customer_code,
             pw.code AS warehouse_code,
             pw.name AS warehouse_name,
             ROUND(s.weight * s.partner_rate,  2) AS partner_ship_fee,
             ROUND(s.weight * s.customer_rate, 2) AS customer_ship_fee,
             ROUND(s.weight * s.partner_rate  + s.surcharge, 2) AS phi_tra_doi_tac,
             ROUND(s.weight * s.customer_rate + s.surcharge, 2) AS phi_vc
      FROM shipments s
      LEFT JOIN customers c         ON c.id  = s.customer_id
      LEFT JOIN partner_warehouses pw ON pw.id = s.warehouse_id
      ${where}
      ORDER BY s.import_date DESC, s.id DESC
    `).all(...params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/shipments/import
// Import pre-parsed rows from client.
// Body: { import_date, rows: [{ customer_name, warehouse_code, tracking_no, product, weight }] }
// ═════════════════════════════════════════════════════════════════════════════
router.post('/import', (req, res) => {
  try {
    const { rows, import_date } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const date     = import_date || todayStr();
    const warnings = [];
    const inserted = [];

    const allCustomers  = db.prepare('SELECT id, name, rate_id FROM customers').all();
    const allWarehouses = db.prepare('SELECT id, code, rate_per_kg FROM partner_warehouses').all();
    const allRates      = db.prepare('SELECT id, rate_per_kg FROM customer_rates').all();

    const customerMap  = new Map(allCustomers.map((c) => [c.name.trim().toLowerCase(), c]));
    const warehouseMap = new Map(allWarehouses.map((w) => [w.code.trim().toUpperCase(), w]));
    const rateMap      = new Map(allRates.map((r) => [r.id, r.rate_per_kg]));

    const insertStmt = db.prepare(`
      INSERT INTO shipments
        (import_date, customer_id, warehouse_id, tracking_no, product, weight, surcharge, partner_rate, customer_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const importAll = db.transaction(() => {
      for (const row of rows) {
        const { customer_name, warehouse_code, tracking_no, product, weight } = row;

        const customer = customerMap.get((customer_name || '').trim().toLowerCase());
        if (!customer) {
          warnings.push(`Không tìm thấy khách hàng: "${customer_name}"`);
          continue;
        }

        const warehouse = warehouseMap.get((warehouse_code || '').trim().toUpperCase());
        if (!warehouse) {
          warnings.push(`Không tìm thấy kho: "${warehouse_code}"`);
        }

        const partnerRate  = warehouse ? warehouse.rate_per_kg : 0;
        const customerRate = customer.rate_id ? (rateMap.get(customer.rate_id) || 0) : 0;
        const warehouseId  = warehouse ? warehouse.id : null;

        const info = insertStmt.run(
          date,
          customer.id,
          warehouseId,
          tracking_no || null,
          product     || null,
          parseFloat(weight) || 0,
          0,
          partnerRate,
          customerRate
        );
        inserted.push(info.lastInsertRowid);
      }
    });

    importAll();

    if (inserted.length > 0) {
      const batchCustomers = db.prepare(`
        SELECT DISTINCT customer_id FROM shipments
        WHERE id IN (${inserted.map(() => '?').join(',')})
      `).all(...inserted);

      const autoDebitAll = db.transaction(() => {
        for (const { customer_id } of batchCustomers) {
          triggerAutoDebit(date, customer_id);
        }
      });
      autoDebitAll();
    }

    res.status(201).json({
      imported:    inserted.length,
      import_date: date,
      warnings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/shipments/:id
// ═════════════════════════════════════════════════════════════════════════════
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Shipment not found' });

    const {
      import_date   = existing.import_date,
      customer_id   = existing.customer_id,
      warehouse_id  = existing.warehouse_id,
      tracking_no   = existing.tracking_no,
      product       = existing.product,
      weight        = existing.weight,
      surcharge     = existing.surcharge,
      partner_rate  = existing.partner_rate,
      customer_rate = existing.customer_rate,
      notes         = existing.notes,
    } = req.body;

    db.prepare(`
      UPDATE shipments
      SET import_date = ?, customer_id = ?, warehouse_id = ?, tracking_no = ?,
          product = ?, weight = ?, surcharge = ?, partner_rate = ?, customer_rate = ?, notes = ?
      WHERE id = ?
    `).run(
      import_date,
      parseInt(customer_id),
      warehouse_id ? parseInt(warehouse_id) : null,
      tracking_no   || null,
      product       || null,
      parseFloat(weight),
      parseFloat(surcharge) || 0,
      parseFloat(partner_rate)  || 0,
      parseFloat(customer_rate) || 0,
      notes || null,
      id
    );

    // Recalculate auto-debit for the affected batch
    triggerAutoDebit(import_date, parseInt(customer_id));
    // Also recalculate old date/customer if date or customer changed
    if (import_date !== existing.import_date || parseInt(customer_id) !== existing.customer_id) {
      triggerAutoDebit(existing.import_date, existing.customer_id);
    }

    const updated = db.prepare(`
      SELECT s.*,
             c.name  AS customer_name,
             c.code  AS customer_code,
             pw.code AS warehouse_code,
             ROUND(s.weight * s.partner_rate  + s.surcharge, 2) AS phi_tra_doi_tac,
             ROUND(s.weight * s.customer_rate + s.surcharge, 2) AS phi_vc
      FROM shipments s
      LEFT JOIN customers c           ON c.id  = s.customer_id
      LEFT JOIN partner_warehouses pw ON pw.id = s.warehouse_id
      WHERE s.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/shipments/:id
// ═════════════════════════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    db.prepare('DELETE FROM shipments WHERE id = ?').run(id);

    // Recalculate auto-debit for the batch (may now be 0 or less)
    triggerAutoDebit(shipment.import_date, shipment.customer_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/shipments/bao-khach
// Báo khách: aggregated view grouped by import_date + customer_id
// Query params: start_date, end_date, customer_id
// ═════════════════════════════════════════════════════════════════════════════
router.get('/bao-khach', (req, res) => {
  try {
    const { start_date, end_date, customer_id } = req.query;

    const conditions = [];
    const params     = [];

    if (start_date)  { conditions.push('s.import_date >= ?'); params.push(start_date); }
    if (end_date)    { conditions.push('s.import_date <= ?'); params.push(end_date);   }
    if (customer_id) { conditions.push('s.customer_id = ?');  params.push(parseInt(customer_id)); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Aggregate rows per (date, customer)
    const batches = db.prepare(`
      SELECT
        s.import_date                                                    AS batch_date,
        s.customer_id,
        c.code                                                           AS customer_code,
        c.name                                                           AS customer_name,
        COUNT(s.id)                                                      AS tracking_count,
        ROUND(SUM(s.weight),   2)                                        AS total_weight,
        ROUND(SUM(s.weight * s.partner_rate),  2)                        AS total_partner_fee,
        ROUND(SUM(s.surcharge), 2)                                       AS total_surcharge,
        ROUND(SUM(s.weight * s.customer_rate + s.surcharge), 2)          AS total_vc_fee,
        bi.van_don_code,
        bi.notified_at,
        bi.id                                                            AS batch_info_id
      FROM shipments s
      LEFT JOIN customers c   ON c.id = s.customer_id
      LEFT JOIN batch_info bi ON bi.batch_date = s.import_date AND bi.customer_id = s.customer_id
      ${where}
      GROUP BY s.import_date, s.customer_id
      ORDER BY s.import_date DESC, c.name
    `).all(...params);

    // For each batch, attach the detail rows
    const detailStmt = db.prepare(`
      SELECT s.*,
             pw.code AS warehouse_code,
             ROUND(s.weight * s.partner_rate  + s.surcharge, 2) AS phi_tra_doi_tac,
             ROUND(s.weight * s.customer_rate + s.surcharge, 2) AS phi_vc
      FROM shipments s
      LEFT JOIN partner_warehouses pw ON pw.id = s.warehouse_id
      WHERE s.import_date = ? AND s.customer_id = ?
      ORDER BY s.id
    `);

    const result = batches.map((b) => ({
      ...b,
      details: detailStmt.all(b.batch_date, b.customer_id),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/shipments/batch
// Update batch_info van_don_code for a (batch_date, customer_id) combo
// Body: { batch_date, customer_id, van_don_code }
// ═════════════════════════════════════════════════════════════════════════════
router.put('/batch', (req, res) => {
  try {
    const { batch_date, customer_id, van_don_code } = req.body;
    if (!batch_date || !customer_id) {
      return res.status(400).json({ error: 'batch_date and customer_id are required' });
    }

    // Ensure the customer has shipments on that date
    const exists = db.prepare(
      'SELECT id FROM shipments WHERE import_date = ? AND customer_id = ? LIMIT 1'
    ).get(batch_date, parseInt(customer_id));
    if (!exists) {
      return res.status(404).json({ error: 'No shipments found for this batch_date + customer_id' });
    }

    db.prepare(`
      INSERT INTO batch_info (batch_date, customer_id, van_don_code)
      VALUES (?, ?, ?)
      ON CONFLICT(batch_date, customer_id) DO UPDATE SET van_don_code = excluded.van_don_code
    `).run(batch_date, parseInt(customer_id), van_don_code || null);

    const updated = db.prepare(
      'SELECT * FROM batch_info WHERE batch_date = ? AND customer_id = ?'
    ).get(batch_date, parseInt(customer_id));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/shipments/batch/notify
// Mark a batch as notified (set notified_at = now)
// Body: { batch_date, customer_id }
// ═════════════════════════════════════════════════════════════════════════════
router.post('/batch/notify', (req, res) => {
  try {
    const { batch_date, customer_id } = req.body;
    if (!batch_date || !customer_id) {
      return res.status(400).json({ error: 'batch_date and customer_id are required' });
    }

    // Upsert batch_info and mark notified
    db.prepare(`
      INSERT INTO batch_info (batch_date, customer_id, notified_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(batch_date, customer_id) DO UPDATE SET notified_at = datetime('now')
    `).run(batch_date, parseInt(customer_id));

    const updated = db.prepare(
      'SELECT * FROM batch_info WHERE batch_date = ? AND customer_id = ?'
    ).get(batch_date, parseInt(customer_id));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Export triggerAutoDebit so transactions route can call it if needed
module.exports = router;
module.exports.triggerAutoDebit = triggerAutoDebit;
