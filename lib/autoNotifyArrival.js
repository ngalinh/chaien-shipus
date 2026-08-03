'use strict';

const db = require('../db');
const { sendZaloMessage } = require('./zaloNotify');

const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

const fmtMoney = (v) => (v == null || isNaN(v) ? '0 đ' : Math.round(v).toLocaleString('en-US') + ' đ');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM company_info WHERE key = ?').get(key);
  return row ? row.value : null;
}

function isEnabled() {
  return getSetting('auto_notify_arrival') === 'true';
}

function buildArrivalText(customerName, items, totalFee) {
  const lines = items
    .map((i) => `• ${i.tracking_no || '–'} — ${i.product || ''} (${Number(i.weight || 0).toFixed(2)}kg) — ${fmtMoney(i.customer_fee)}`)
    .join('\n');
  return `Anh/Chị ${customerName} ơi, lô hàng của mình đã về kho ạ 📦\n\n${lines}\n\nTổng phí VC: ${fmtMoney(totalFee)}\nVui lòng thanh toán phí vận chuyển trước khi nhận hàng. Cảm ơn anh/chị!`;
}

const detailStmt = db.prepare(`
  SELECT tracking_no, product, weight, ROUND(weight * customer_rate + surcharge, 2) AS customer_fee
  FROM shipments WHERE import_date = ? AND customer_id = ?
`);

async function runOnce() {
  if (!isEnabled()) return;
  // Chỉ báo lô có kiện tạo SAU thời điểm bật công tắc lần gần nhất — bỏ qua tồn đọng cũ.
  const enabledAt = getSetting('auto_notify_arrival_enabled_at') || '0000-00-00';

  const batches = db.prepare(`
    SELECT s.import_date AS batch_date, s.customer_id, c.name AS customer_name, c.phone,
           MIN(s.created_at) AS first_created_at
    FROM shipments s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN batch_info bi ON bi.batch_date = s.import_date AND bi.customer_id = s.customer_id
    WHERE bi.notified_at IS NULL
    GROUP BY s.import_date, s.customer_id
    HAVING first_created_at >= ?
  `).all(enabledAt);

  for (const b of batches) {
    if (!b.phone) continue;

    const items = detailStmt.all(b.batch_date, b.customer_id);
    if (!items.length) continue;
    const totalFee = items.reduce((sum, i) => sum + (i.customer_fee || 0), 0);
    const message = buildArrivalText(b.customer_name, items, totalFee);

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await sendZaloMessage({ phone: b.phone, name: b.customer_name, message });
      if (!result.ok) {
        console.warn(`[auto-notify-arrival] Gửi lỗi "${b.customer_name}" (${b.batch_date}): ${result.error}`);
        continue;
      }
      const markNotified = db.transaction(() => {
        db.prepare(`
          INSERT INTO batch_info (batch_date, customer_id, notified_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(batch_date, customer_id) DO UPDATE SET notified_at = datetime('now')
        `).run(b.batch_date, b.customer_id);
        db.prepare(
          'INSERT INTO notification_log (batch_date, customer_id) VALUES (?, ?)'
        ).run(b.batch_date, b.customer_id);
      });
      markNotified();
      console.log(`[auto-notify-arrival] Đã báo "${b.customer_name}" (${b.batch_date})`);
    } catch (e) {
      console.warn(`[auto-notify-arrival] Lỗi "${b.customer_name}" (${b.batch_date}): ${e.message}`);
    }
  }
}

function start() {
  setInterval(() => {
    runOnce().catch((e) => console.error('[auto-notify-arrival] Lỗi quét:', e.message));
  }, SCAN_INTERVAL_MS).unref();
  console.log(`[auto-notify-arrival] Đã khởi động, quét mỗi ${SCAN_INTERVAL_MS / 60000} phút.`);
}

module.exports = { start, runOnce, isEnabled };
