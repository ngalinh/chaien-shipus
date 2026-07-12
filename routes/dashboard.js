'use strict';

const express = require('express');
const db      = require('../db');

const router = express.Router();

// ─── Helper: resolve period query params to [startDate, endDate] strings ─────
function resolveDateRange(query) {
  const { period, start_date, end_date } = query;

  if (start_date && end_date) {
    return [start_date, end_date];
  }

  const now  = new Date();
  const endD = now.toISOString().slice(0, 10);       // today

  let startD;
  switch (period) {
    case '1m':
      startD = new Date(now.getFullYear(), now.getMonth() - 1,  now.getDate()).toISOString().slice(0, 10);
      break;
    case '3m':
      startD = new Date(now.getFullYear(), now.getMonth() - 3,  now.getDate()).toISOString().slice(0, 10);
      break;
    case '6m':
      startD = new Date(now.getFullYear(), now.getMonth() - 6,  now.getDate()).toISOString().slice(0, 10);
      break;
    case '1y':
      startD = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
      break;
    default:
      // Default: current month
      startD = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }

  return [startD, endD];
}

// ─── Helper: generate YYYY-MM labels between two date strings ─────────────────
function monthsBetween(startDate, endDate) {
  const months = [];
  const start  = new Date(startDate.slice(0, 7) + '-01');
  const end    = new Date(endDate.slice(0, 7) + '-01');
  const cur    = new Date(start);
  while (cur <= end) {
    months.push(cur.toISOString().slice(0, 7)); // YYYY-MM
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard
// Query params: period ('1m' | '3m' | '6m' | '1y') OR start_date + end_date
// ═════════════════════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  try {
    const [startDate, endDate] = resolveDateRange(req.query);

    // ── 1. Total customers with shipments in period ────────────────────────
    const totalCustomersRow = db.prepare(`
      SELECT COUNT(DISTINCT customer_id) AS total_customers
      FROM shipments
      WHERE import_date >= ? AND import_date <= ?
    `).get(startDate, endDate);

    // ── 2. New customers created in period ────────────────────────────────
    const newCustomersRow = db.prepare(`
      SELECT COUNT(*) AS new_customers
      FROM customers
      WHERE date(created_at) >= ? AND date(created_at) <= ?
    `).get(startDate, endDate);

    // ── 3. Total weight shipped in period ─────────────────────────────────
    const weightRow = db.prepare(`
      SELECT COALESCE(SUM(weight), 0) AS total_weight
      FROM shipments
      WHERE import_date >= ? AND import_date <= ?
    `).get(startDate, endDate);

    // ── 4. Total VC fee (customer side) and gross margin ──────────────────
    const vcFeeRow = db.prepare(`
      SELECT
        ROUND(COALESCE(SUM(weight * customer_rate + surcharge), 0), 2) AS total_vc_fee_customer,
        ROUND(COALESCE(SUM(weight * partner_rate),              0), 2) AS total_vc_fee_partner,
        ROUND(COALESCE(SUM(weight * customer_rate + surcharge - weight * partner_rate), 0), 2) AS gross_margin
      FROM shipments
      WHERE import_date >= ? AND import_date <= ?
    `).get(startDate, endDate);

    // ── 5. Total payments received in period ──────────────────────────────
    const paymentsRow = db.prepare(`
      SELECT COALESCE(SUM(credit), 0) AS total_payments_received
      FROM transactions
      WHERE reference_type = 'payment'
        AND trans_date >= ? AND trans_date <= ?
    `).get(startDate, endDate);

    // ── 6. Receivable (total vc fees - payments received, all time) ────────
    const receivableRow = db.prepare(`
      SELECT
        ROUND(
          COALESCE((SELECT SUM(debit)  FROM transactions), 0) -
          COALESCE((SELECT SUM(credit) FROM transactions), 0),
        2) AS total_receivable
    `).get();

    // ── 7. Monthly breakdown for chart ────────────────────────────────────
    const monthlyRaw = db.prepare(`
      SELECT
        strftime('%Y-%m', import_date)                                    AS month,
        COUNT(DISTINCT customer_id)                                        AS active_customers,
        COUNT(*)                                                           AS shipment_count,
        ROUND(COALESCE(SUM(weight), 0), 2)                                 AS total_weight,
        ROUND(COALESCE(SUM(weight * customer_rate + surcharge), 0), 2)     AS total_vc_fee_customer,
        ROUND(COALESCE(SUM(weight * partner_rate),               0), 2)     AS total_vc_fee_partner,
        ROUND(COALESCE(SUM(weight * customer_rate + surcharge - weight * partner_rate), 0), 2) AS gross_margin
      FROM shipments
      WHERE import_date >= ? AND import_date <= ?
      GROUP BY strftime('%Y-%m', import_date)
      ORDER BY month ASC
    `).all(startDate, endDate);

    // Fill in months with no data so chart has a complete x-axis
    const allMonths   = monthsBetween(startDate, endDate);
    const monthlyMap  = new Map(monthlyRaw.map((r) => [r.month, r]));
    const monthly_breakdown = allMonths.map((m) => monthlyMap.get(m) || {
      month:                m,
      active_customers:     0,
      shipment_count:       0,
      total_weight:         0,
      total_vc_fee_customer: 0,
      total_vc_fee_partner:  0,
      gross_margin:         0,
    });

    // ── 8. Top customers by VC fee in period ─────────────────────────────
    const topCustomers = db.prepare(`
      SELECT
        s.customer_id,
        c.code                                                          AS customer_code,
        c.name                                                          AS customer_name,
        ROUND(SUM(s.weight), 2)                                         AS total_weight,
        ROUND(SUM(s.weight * s.customer_rate + s.surcharge), 2)         AS total_vc_fee,
        COUNT(s.id)                                                     AS shipment_count
      FROM shipments s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.import_date >= ? AND s.import_date <= ?
      GROUP BY s.customer_id
      ORDER BY total_vc_fee DESC
      LIMIT 10
    `).all(startDate, endDate);

    // ── 9. Warehouse breakdown in period ──────────────────────────────────
    const warehouseBreakdown = db.prepare(`
      SELECT
        s.warehouse_id,
        pw.code                                                         AS warehouse_code,
        pw.name                                                         AS warehouse_name,
        ROUND(SUM(s.weight), 2)                                         AS total_weight,
        ROUND(SUM(s.weight * s.partner_rate), 2)                         AS total_partner_fee,
        COUNT(s.id)                                                     AS shipment_count
      FROM shipments s
      LEFT JOIN partner_warehouses pw ON pw.id = s.warehouse_id
      WHERE s.import_date >= ? AND s.import_date <= ?
      GROUP BY s.warehouse_id
      ORDER BY total_weight DESC
    `).all(startDate, endDate);

    res.json({
      period: { start_date: startDate, end_date: endDate },
      summary: {
        total_customers:           totalCustomersRow.total_customers,
        new_customers:             newCustomersRow.new_customers,
        total_weight:              Math.round((weightRow.total_weight || 0) * 100) / 100,
        total_vc_fee_customer:     vcFeeRow.total_vc_fee_customer,
        total_vc_fee_partner:      vcFeeRow.total_vc_fee_partner,
        gross_margin:              vcFeeRow.gross_margin,
        total_payments_received:   Math.round((paymentsRow.total_payments_received || 0) * 100) / 100,
        total_receivable:          receivableRow.total_receivable || 0,
      },
      monthly_breakdown,
      top_customers:      topCustomers,
      warehouse_breakdown: warehouseBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
