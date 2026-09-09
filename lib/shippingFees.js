'use strict';
const db = require('../db');

// Repeat batch metadata on each parcel; clients deduplicate by batch_fee_key.
function attachBatchFees(rows) {
  const lookup = db.prepare(`SELECT * FROM shipping_batch_fees
    WHERE import_date = ? AND customer_id = ? AND warehouse_id IS ?`);
  const cache = new Map();
  return rows.map(row => {
    const key = `${row.import_date}|${row.customer_id}|${row.warehouse_id ?? 'null'}`;
    if (!cache.has(key)) cache.set(key, lookup.get(row.import_date, row.customer_id, row.warehouse_id ?? null));
    const fee = cache.get(key);
    if (!fee) return row;
    return { ...row, batch_fee_key: key, batch_fee: fee.fee, batch_base_fee: fee.base_fee,
      batch_weight: fee.total_weight, batch_rate: fee.customer_rate, batch_surcharge: fee.total_surcharge,
      waive_minimum: !!fee.waive_minimum, fee_discount: Math.min(fee.discount, Math.max(0, fee.base_fee)),
      fee_discount_requested: fee.discount, fee_reason: fee.adjustment_reason };
  });
}
module.exports = { attachBatchFees };
