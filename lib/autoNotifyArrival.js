'use strict';

const db = require('../db');
const { sendZaloMessage } = require('./zaloNotify');

// Gộp nhiều lần Nhập kho liên tiếp cho cùng 1 khách/ngày thành 1 tin, và cho NV vài chục giây
// kịp sửa nếu nhập nhầm trước khi tin thật sự bay đi — cùng tinh thần với autoNotifyShipped.js.
const DEBOUNCE_MS = 60 * 1000;

// URL công khai của CHÍNH TRANG WEB chaien-shipus (không phải domain gốc ai.basso.vn — đó là
// dashboard chọn bot của cả nền tảng BASSO; app chaien nằm dưới prefix /b/<bot-id> riêng).
// Dùng để runner (máy khác) tự mở trang /print/arrival mà chụp ảnh phiếu.
const APP_URL = (process.env.PUBLIC_APP_URL || 'https://ai.basso.vn/b/e5f5323bdc7532ac').replace(/\/$/, '');
const RUNNER_API_KEY = process.env.ZALO_RUNNER_API_KEY || '';

function getSetting(key) {
  const row = db.prepare('SELECT value FROM company_info WHERE key = ?').get(key);
  return row ? row.value : null;
}

function isEnabled() {
  return getSetting('auto_notify_arrival') === 'true';
}

// key dùng chung với ZALO_RUNNER_API_KEY — /api/shipments/print-data ở phía routes/shipments.js
// đối chiếu đúng khoá này trước khi trả dữ liệu khách (tên, số tiền, QR chuyển khoản).
function printUrl(batchDate, customerId) {
  return `${APP_URL}/#/print/arrival/${batchDate}/${customerId}?key=${encodeURIComponent(RUNNER_API_KEY)}`;
}

const detailStmt = db.prepare(`
  SELECT tracking_no, product, weight, ROUND(weight * customer_rate + surcharge, 2) AS customer_fee
  FROM shipments WHERE import_date = ? AND customer_id = ?
`);
const firstCreatedStmt = db.prepare('SELECT MIN(created_at) AS first_created_at FROM shipments WHERE import_date = ? AND customer_id = ?');
const notifiedStmt = db.prepare('SELECT notified_at FROM batch_info WHERE batch_date = ? AND customer_id = ?');
const customerStmt = db.prepare('SELECT name, phone FROM customers WHERE id = ?');

/** Đọc DB TƯƠI tại thời điểm timer bắn rồi gửi nếu đủ điều kiện. */
async function sendNow(batchDate, customerId) {
  try {
    if (!isEnabled()) return;

    // Chỉ báo lô có kiện tạo SAU thời điểm bật công tắc lần gần nhất — bỏ qua tồn đọng cũ.
    const enabledAt = getSetting('auto_notify_arrival_enabled_at') || '0000-00-00';
    const first = firstCreatedStmt.get(batchDate, customerId);
    if (!first?.first_created_at || first.first_created_at < enabledAt) return;

    // Đã báo rồi (kể cả báo tay) -> không báo lại.
    const already = notifiedStmt.get(batchDate, customerId);
    if (already?.notified_at) return;

    const customer = customerStmt.get(customerId);
    if (!customer?.phone) return;

    const items = detailStmt.all(batchDate, customerId);
    if (!items.length) return;

    const renderUrl = printUrl(batchDate, customerId);
    const result = await sendZaloMessage({ phone: customer.phone, name: customer.name, renderUrl });
    if (!result.ok) {
      db.prepare(
        'INSERT INTO notification_log (batch_date, customer_id, type, channel, status, error, sent_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(batchDate, customerId, 'arrival', 'zalo', 'failed', result.error || null, 'Bot tự động');
      console.warn(`[auto-notify-arrival] Gửi lỗi "${customer.name}" (${batchDate}): ${result.error}`);
      return;
    }
    const markNotified = db.transaction(() => {
      db.prepare(`
        INSERT INTO batch_info (batch_date, customer_id, notified_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(batch_date, customer_id) DO UPDATE SET notified_at = datetime('now')
      `).run(batchDate, customerId);
      db.prepare(
        'INSERT INTO notification_log (batch_date, customer_id, type, channel, status, sent_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(batchDate, customerId, 'arrival', 'zalo', 'success', 'Bot tự động');
    });
    markNotified();
    console.log(`[auto-notify-arrival] Đã báo "${customer.name}" (${batchDate})`);
  } catch (e) {
    console.warn(`[auto-notify-arrival] Lỗi (${batchDate}/${customerId}): ${e.message}`);
  }
}

// Map<"batchDate::customerId", Timeout> — lịch gửi đang chờ (debounce).
const pendingTimers = new Map();
function batchKey(batchDate, customerId) {
  return `${batchDate}::${customerId}`;
}

/**
 * Gọi ngay sau khi NV Nhập kho (POST /api/shipments/import) cho 1 (batch_date, customer_id).
 * KHÔNG gửi ngay — đặt lịch gửi sau DEBOUNCE_MS. Gọi lại (cùng batch) trong lúc đang chờ sẽ
 * HUỶ lịch cũ và đặt lại từ đầu — nên nhiều lần nhập liên tiếp trong DEBOUNCE_MS chỉ gộp
 * thành 1 tin duy nhất, kèm đủ kiện hàng tại thời điểm gửi.
 */
function maybeNotify(batchDate, customerId) {
  const key = batchKey(batchDate, customerId);
  const prev = pendingTimers.get(key);
  if (prev) clearTimeout(prev);

  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    sendNow(batchDate, customerId);
  }, DEBOUNCE_MS);
  timer.unref?.();
  pendingTimers.set(key, timer);
}

module.exports = { maybeNotify, isEnabled };
