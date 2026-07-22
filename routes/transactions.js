'use strict';

const express = require('express');
const db      = require('../db');

const router = express.Router();

// ─── Helper: build running balance over an ordered list of transactions ───────
function attachRunningBalance(rows) {
  let balance = 0;
  return rows.map((row) => {
    balance += (row.credit - row.debit);
    return { ...row, running_balance: Math.round(balance * 100) / 100 };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/transactions
// All transactions across all customers (global ledger view)
// Query params: start_date, end_date, customer_id, reference_type
// ═════════════════════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  try {
    const { start_date, end_date, customer_id, reference_type } = req.query;

    const conditions = [];
    const params     = [];

    if (start_date)     { conditions.push('t.trans_date >= ?');     params.push(start_date);           }
    if (end_date)       { conditions.push('t.trans_date <= ?');     params.push(end_date);             }
    if (customer_id)    { conditions.push('t.customer_id = ?');     params.push(parseInt(customer_id)); }
    if (reference_type) { conditions.push('t.reference_type = ?'); params.push(reference_type);       }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = db.prepare(`
      SELECT t.*,
             c.name AS customer_name,
             c.code AS customer_code
      FROM transactions t
      LEFT JOIN customers c ON c.id = t.customer_id
      ${where}
      ORDER BY t.trans_date ASC, t.id ASC
    `).all(...params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/transactions/ledger
// Sổ tiền mặt cho trang Giao dịch: gộp "Phí VC khách trả" (THU) + "Phí VC trả
// đối tác" (CHI). KHÔNG gồm phí cước khách nợ (reference_type='shipment_batch').
// Query: start_date, end_date
// ═════════════════════════════════════════════════════════════════════════════
router.get('/ledger', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const buildDate = (col) => {
      const c = [], p = [];
      if (start_date) { c.push(`${col} >= ?`); p.push(start_date); }
      if (end_date)   { c.push(`${col} <= ?`); p.push(end_date); }
      return { clause: c.length ? 'AND ' + c.join(' AND ') : '', params: p };
    };

    // Khách trả (credit trong transactions)
    const cp = buildDate('t.trans_date');
    const payments = db.prepare(`
      SELECT t.id, t.trans_date, t.description, t.credit AS amount,
             t.customer_id, c.code AS customer_code, c.name AS customer_name
      FROM transactions t
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE t.reference_type = 'payment' ${cp.clause}
    `).all(...cp.params);

    // Trả đối tác (bảng partner_payments)
    const pp = buildDate('p.trans_date');
    const partner = db.prepare(`
      SELECT p.id, p.trans_date, p.description, p.amount,
             p.warehouse_id, w.code AS warehouse_code, w.name AS warehouse_name
      FROM partner_payments p
      LEFT JOIN partner_warehouses w ON w.id = p.warehouse_id
      WHERE 1 = 1 ${pp.clause}
    `).all(...pp.params);

    const rows = [
      ...payments.map((r) => ({
        key: `pay-${r.id}`,
        trans_date: r.trans_date,
        category: 'customer_payment',
        customer_id: r.customer_id,
        customer_code: r.customer_code,
        customer_name: r.customer_name,
        description: r.description,
        thu: r.amount || 0,
        chi: 0,
      })),
      ...partner.map((r) => ({
        key: `partner-${r.id}`,
        trans_date: r.trans_date,
        category: 'partner_payment',
        warehouse_id: r.warehouse_id,
        warehouse_code: r.warehouse_code,
        warehouse_name: r.warehouse_name,
        description: r.description,
        thu: 0,
        chi: r.amount || 0,
      })),
    ].sort((a, b) =>
      a.trans_date < b.trans_date ? -1 : a.trans_date > b.trans_date ? 1 : 0
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/transactions/:customerId
// All transactions for one customer, with running balance
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:customerId', (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);

    const customer = db.prepare('SELECT id, code, name FROM customers WHERE id = ?').get(customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const rows = db.prepare(`
      SELECT t.*
      FROM transactions t
      WHERE t.customer_id = ?
      ORDER BY t.trans_date ASC, t.id ASC
    `).all(customerId);

    const withBalance = attachRunningBalance(rows);

    // Summary totals
    const totalsRow = db.prepare(`
      SELECT
        COALESCE(SUM(debit),  0) AS total_debit,
        COALESCE(SUM(credit), 0) AS total_credit
      FROM transactions
      WHERE customer_id = ?
    `).get(customerId);

    res.json({
      customer,
      transactions:  withBalance,
      total_debit:   totalsRow.total_debit,
      total_credit:  totalsRow.total_credit,
      net_balance:   Math.round((totalsRow.total_credit - totalsRow.total_debit) * 100) / 100,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/transactions/payment
// Record a customer payment (credit transaction)
// Body: { customer_id, payment_date, amount, bank_account_id, content, reference_batch_date }
// ═════════════════════════════════════════════════════════════════════════════
router.post('/payment', (req, res) => {
  try {
    const {
      customer_id,
      payment_date,
      amount,
      bank_account_id,
      content,
      reference_batch_date,
    } = req.body;

    if (!customer_id || !payment_date || amount == null) {
      return res.status(400).json({ error: 'customer_id, payment_date and amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(parseInt(customer_id));
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Build description: use provided content, or auto-generate
    let description = content || `Thanh toán ngày ${payment_date}`;
    if (reference_batch_date) {
      description += ` (lô ${reference_batch_date})`;
    }

    // Optionally enrich with bank account info
    let bankNote = '';
    if (bank_account_id) {
      const bank = db.prepare('SELECT bank_name, account_number FROM bank_accounts WHERE id = ?')
        .get(parseInt(bank_account_id));
      if (bank) bankNote = ` [${bank.bank_name} - ${bank.account_number}]`;
    }

    const info = db.prepare(`
      INSERT INTO transactions (trans_date, customer_id, description, debit, credit, reference_type, reference_id)
      VALUES (?, ?, ?, 0, ?, 'payment', ?)
    `).run(
      payment_date,
      parseInt(customer_id),
      description + bankNote,
      parsedAmount,
      reference_batch_date ? String(reference_batch_date) : null
    );

    const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/transactions/partner-payment
// Ghi nhận khoản CHI trả đối tác vận chuyển. Body: { trans_date, warehouse_id, amount, description }
// ═════════════════════════════════════════════════════════════════════════════
router.post('/partner-payment', (req, res) => {
  try {
    const { trans_date, warehouse_id, amount, description } = req.body;
    if (!trans_date || amount == null) {
      return res.status(400).json({ error: 'trans_date and amount are required' });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    const wid = warehouse_id ? parseInt(warehouse_id) : null;
    if (!wid) {
      return res.status(400).json({ error: 'warehouse_id is required' });
    }
    const wh = db.prepare('SELECT id FROM partner_warehouses WHERE id = ?').get(wid);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

    const info = db.prepare(`
      INSERT INTO partner_payments (trans_date, warehouse_id, amount, description)
      VALUES (?, ?, ?, ?)
    `).run(trans_date, wid, amt, description || null);

    res.status(201).json(db.prepare('SELECT * FROM partner_payments WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/transactions/auto-debit
// Called internally (or externally) to create/update a debit transaction
// for a (import_date, customer_id) shipment batch.
// Body: { import_date, customer_id }
// ═════════════════════════════════════════════════════════════════════════════
router.post('/auto-debit', (req, res) => {
  try {
    const { import_date, customer_id } = req.body;
    if (!import_date || !customer_id) {
      return res.status(400).json({ error: 'import_date and customer_id are required' });
    }

    const cid = parseInt(customer_id);
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(cid);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const feeRow = db.prepare(`
      SELECT COALESCE(SUM(weight * customer_rate + surcharge), 0) AS total_vc_fee,
             COUNT(*) AS cnt
      FROM shipments
      WHERE import_date = ? AND customer_id = ?
    `).get(import_date, cid);

    if (!feeRow || feeRow.cnt === 0) {
      return res.status(404).json({ error: 'No shipments found for this batch' });
    }

    const refId = String(import_date + '_' + cid);
    const existing = db.prepare(`
      SELECT id FROM transactions
      WHERE customer_id = ? AND trans_date = ? AND reference_type = 'shipment_batch' AND reference_id = ?
    `).get(cid, import_date, refId);

    let transId;
    if (existing) {
      db.prepare(`
        UPDATE transactions SET debit = ?, description = ? WHERE id = ?
      `).run(feeRow.total_vc_fee, `Phí VC lô ${import_date}`, existing.id);
      transId = existing.id;
    } else {
      const info = db.prepare(`
        INSERT INTO transactions (trans_date, customer_id, description, debit, credit, reference_type, reference_id)
        VALUES (?, ?, ?, ?, 0, 'shipment_batch', ?)
      `).run(import_date, cid, `Phí VC lô ${import_date}`, feeRow.total_vc_fee, refId);
      transId = info.lastInsertRowid;
    }

    const result = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
