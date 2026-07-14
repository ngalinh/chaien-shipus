'use strict';

const db = require('../db');

/**
 * Tính trạng thái thanh toán từng LÔ (đợt = import_date + customer_id) bằng FIFO.
 *
 * Data model: tiền ghi theo sổ cái từng khách (transactions: debit = phí VC mỗi lô,
 * credit = thanh toán). Thanh toán KHÔNG gán cứng vào lô nào, nên "đã trả hay chưa"
 * được suy ra: cộng tổng tiền khách đã trả rồi trừ nợ các lô CŨ trước (oldest-first).
 *
 * Phí VC mỗi lô lấy trực tiếp từ shipments (không phụ thuộc transaction debit có/chưa tạo).
 *
 * @param {number[]} customerIds - danh sách customer_id cần tính (thường là các khách trong view)
 * @returns {Map<string, {status:'paid'|'partial'|'unpaid', paid_amount:number, remaining_amount:number}>}
 *          key = `${import_date}|${customer_id}`
 */
function computePaidStatus(customerIds) {
  const ids = [...new Set((customerIds || []).map(Number).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;

  const ph = ids.map(() => '?').join(',');

  // Phí VC mỗi lô, sắp theo khách rồi ngày (cũ → mới) để FIFO
  const batches = db.prepare(`
    SELECT s.import_date AS d,
           s.customer_id AS cid,
           ROUND(SUM(s.weight * s.customer_rate + s.surcharge), 2) AS fee
    FROM shipments s
    WHERE s.customer_id IN (${ph})
    GROUP BY s.import_date, s.customer_id
    ORDER BY s.customer_id, s.import_date ASC
  `).all(...ids);

  // Tổng tiền đã trả của từng khách
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
    map.set(`${b.d}|${b.cid}`, {
      status,
      paid_amount: Math.round(alloc),
      remaining_amount: Math.max(0, Math.round(fee - alloc)),
    });
  }
  return map;
}

module.exports = { computePaidStatus };
