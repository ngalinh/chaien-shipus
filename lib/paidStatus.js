'use strict';

const db = require('../db');

/**
 * Tính trạng thái thanh toán từng LÔ (đợt = import_date + customer_id + warehouse_id) bằng FIFO.
 *
 * Mỗi kho (warehouse) của cùng 1 khách trong cùng ngày được tính phí riêng vì cước theo kho có thể khác nhau.
 * FIFO: phân bổ tiền đã trả theo thứ tự (customer_id, import_date ASC, warehouse_id ASC).
 *
 * @param {number[]} customerIds
 * @returns {Map<string, {status, paid_amount, remaining_amount}>}
 *          key = `${import_date}|${customer_id}|${warehouse_id ?? 'null'}`
 */
function computePaidStatus(customerIds) {
  const ids = [...new Set((customerIds || []).map(Number).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;

  const ph = ids.map(() => '?').join(',');

  // Phí VC mỗi lô theo kho — tách warehouse để tránh MAX(rate) cross-kho
  const batches = db.prepare(`
    SELECT s.import_date AS d,
           s.customer_id AS cid,
           s.warehouse_id AS wid,
           ROUND(MAX(0.5, COALESCE(SUM(s.weight), 0)) * COALESCE(MAX(s.customer_rate), 0)
                 + COALESCE(SUM(s.surcharge), 0), 0) AS fee
    FROM shipments s
    WHERE s.customer_id IN (${ph})
    GROUP BY s.import_date, s.customer_id, s.warehouse_id
    ORDER BY s.customer_id, s.import_date ASC, s.warehouse_id ASC
  `).all(...ids);

  const paidRows = db.prepare(`
    SELECT customer_id AS cid, COALESCE(SUM(credit), 0) AS paid
    FROM transactions
    WHERE credit > 0 AND customer_id IN (${ph})
    GROUP BY customer_id
  `).all(...ids);
  const paidBy = new Map(paidRows.map((r) => [r.cid, r.paid]));

  let curCust = null;
  let remaining = 0;
  for (const b of batches) {
    if (b.cid !== curCust) {
      curCust = b.cid;
      remaining = paidBy.get(curCust) || 0;
    }
    const fee = b.fee || 0;
    const alloc = Math.min(remaining, fee);
    remaining -= alloc;
    let status;
    if (fee <= 0.001 || alloc >= fee - 0.001) status = 'paid';
    else if (alloc > 0.001) status = 'partial';
    else status = 'unpaid';
    map.set(`${b.d}|${b.cid}|${b.wid ?? 'null'}`, {
      status,
      paid_amount: Math.round(alloc),
      remaining_amount: Math.max(0, Math.round(fee - alloc)),
    });
  }
  return map;
}

module.exports = { computePaidStatus };
