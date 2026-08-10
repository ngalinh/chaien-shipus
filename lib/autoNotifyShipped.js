'use strict';

const db = require('../db');
const { sendZaloMessage } = require('./zaloNotify');

// NV sửa mã trong lúc chờ (nhập nhầm) -> huỷ lịch gửi cũ, tính giờ lại từ mã mới nhất —
// tránh gửi ngay tin sai cho khách rồi không có cách tự đính chính (dedup chặn gửi lại).
const DEBOUNCE_MS = 2.5 * 60 * 1000;

function getSetting(key) {
  const row = db.prepare('SELECT value FROM company_info WHERE key = ?').get(key);
  return row ? row.value : null;
}

function isEnabled() {
  return getSetting('auto_notify_shipped') === 'true';
}

// Giống buildShipText ở client/src/pages/Shipping.jsx — giữ đồng bộ nếu sửa 1 bên.
function buildShipText(customerName, carrier, rows, batchVanDonCode) {
  const c = carrier || 'Giao hàng tiết kiệm';
  const footer = `Phí ship anh/chị vui lòng thanh toán cho shipper khi nhận hàng.\nDự kiến 2–5 ngày (tùy khu vực) mình sẽ nhận được hàng. Nếu cần hỗ trợ về đơn hàng, anh/chị cứ nhắn bên em nhé 💕`;

  const perRowCodes = rows.filter((r) => r.van_don_code);
  const uniqueCodes = [...new Set(perRowCodes.map((r) => r.van_don_code))];

  if (perRowCodes.length > 0 && uniqueCodes.length > 1) {
    const lines = perRowCodes
      .map((r) => `• ${r.tracking_no || '?'}: ${r.van_don_code}\n  🔎 https://i.ghtk.vn/${r.van_don_code}`)
      .join('\n');
    return `Anh/Chị ${customerName} ơi, đơn hàng của mình đã được bàn giao cho ${c} rồi ạ 🚚\n\n📦 Các mã vận đơn:\n${lines}\n\n${footer}`;
  }

  const code = perRowCodes[0]?.van_don_code || batchVanDonCode || '';
  return `Anh/Chị ${customerName} ơi, đơn hàng của mình đã được bàn giao cho ${c} rồi ạ 🚚\n📦 Mã vận đơn: ${code}\n🔎 Theo dõi đơn hàng: https://i.ghtk.vn/${code}\n${footer}`;
}

const rowsStmt = db.prepare('SELECT tracking_no, van_don_code FROM shipments WHERE import_date = ? AND customer_id = ?');
const firstCreatedStmt = db.prepare('SELECT MIN(created_at) AS first_created_at FROM shipments WHERE import_date = ? AND customer_id = ?');
const batchInfoStmt = db.prepare('SELECT van_don_code FROM batch_info WHERE batch_date = ? AND customer_id = ?');
const customerStmt = db.prepare('SELECT name, phone FROM customers WHERE id = ?');
const alreadySentStmt = db.prepare(`
  SELECT 1 FROM notification_log
  WHERE batch_date = ? AND customer_id = ? AND type = 'shipped' AND status = 'success'
  LIMIT 1
`);

// Map<"batchDate::customerId", Timeout> — lịch gửi đang chờ (debounce), để huỷ khi NV sửa mã
// tiếp trong lúc chờ. Sống trong RAM: mất khi restart process, chấp nhận được (chỉ trễ 1 lần
// gửi trong ~DEBOUNCE_MS hiếm khi trùng lúc deploy/restart).
const pendingTimers = new Map();

function batchKey(batchDate, customerId) {
  return `${batchDate}::${customerId}`;
}

/** Đọc DB TƯƠI tại thời điểm timer bắn (không dùng dữ liệu lúc đặt lịch) rồi gửi nếu đủ điều kiện. */
async function sendNow(batchDate, customerId) {
  try {
    if (!isEnabled()) return;

    const enabledAt = getSetting('auto_notify_shipped_enabled_at') || '0000-00-00';
    const first = firstCreatedStmt.get(batchDate, customerId);
    if (!first?.first_created_at || first.first_created_at < enabledAt) return;

    if (alreadySentStmt.get(batchDate, customerId)) return;

    const customer = customerStmt.get(customerId);
    if (!customer?.phone) return;

    const rows = rowsStmt.all(batchDate, customerId);
    const batchInfo = batchInfoStmt.get(batchDate, customerId);
    const hasCode = rows.some((r) => r.van_don_code) || !!batchInfo?.van_don_code;
    if (!hasCode) return;

    const carrier = getSetting('delivery_carrier');
    const message = buildShipText(customer.name, carrier, rows, batchInfo?.van_don_code);

    const result = await sendZaloMessage({ phone: customer.phone, name: customer.name, message });
    if (result.ok) {
      // Gửi thành công -> tự chuyển badge "Trạng thái" sang "Đã báo ship", khỏi cần NV tự sửa.
      db.prepare(`
        INSERT INTO batch_info (batch_date, customer_id, status)
        VALUES (?, ?, 'Đã báo ship')
        ON CONFLICT(batch_date, customer_id) DO UPDATE SET status = 'Đã báo ship'
      `).run(batchDate, customerId);
    }
    db.prepare(
      `INSERT INTO notification_log (batch_date, customer_id, type, channel, message, status, error, sent_by)
       VALUES (?, ?, 'shipped', 'zalo', ?, ?, ?, 'Bot tự động')`
    ).run(batchDate, customerId, message, result.ok ? 'success' : 'failed', result.ok ? null : (result.error || null));

    if (result.ok) console.log(`[auto-notify-shipped] Đã báo "${customer.name}" (${batchDate})`);
    else console.warn(`[auto-notify-shipped] Gửi lỗi "${customer.name}" (${batchDate}): ${result.error}`);
  } catch (e) {
    console.warn(`[auto-notify-shipped] Lỗi (${batchDate}/${customerId}): ${e.message}`);
  }
}

/**
 * Gọi ngay sau khi NV lưu mã vận đơn (batch-level hoặc từng dòng). KHÔNG gửi ngay lập tức —
 * đặt lịch gửi sau DEBOUNCE_MS. Gọi lại (cùng batch_date + customer_id) trong lúc đang chờ
 * sẽ HUỶ lịch cũ và đặt lại từ đầu — nên NV sửa mã nhập nhầm trong vòng DEBOUNCE_MS thì bot
 * chỉ gửi 1 lần với mã ĐÚNG NHẤT, không gửi tin sai trước đó.
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
