// API batch totals include the minimum, surcharges and any approved adjustment.
export function feeTotals(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.batch_fee_key && row.batch_fee != null) groups.set(row.batch_fee_key, row);
  }
  if (!groups.size) return null;
  return [...groups.values()].reduce((sum, row) => ({
    fee: sum.fee + row.batch_fee,
    discount: sum.discount + (row.fee_discount || 0),
    weight: sum.weight + Math.max(row.waive_minimum ? 0 : 0.5, row.batch_weight || 0),
    waived: sum.waived || row.waive_minimum,
  }), { fee: 0, discount: 0, weight: 0, waived: false });
}
