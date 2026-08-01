'use strict';

/**
 * Giữ URL local-runner (Playwright/Chrome, chạy trên máy khác) mà runner TỰ ĐĂNG KÝ qua
 * POST /api/register-local (xem server.js) — cần thiết vì runner có thể sau NAT / đổi IP,
 * không có địa chỉ cố định để backend gọi thẳng.
 *
 * Lưu trong RAM (mất khi restart) nên runner phải heartbeat định kỳ (xem start.js) để URL
 * luôn "tươi". Hết hạn (quá TTL không thấy heartbeat) coi như chưa đăng ký -> zaloNotify.js
 * rơi về ZALO_RUNNER_URL tĩnh trong .env (dùng khi chạy cùng máy/LAN có IP cố định).
 */

const TTL_MS = 90_000; // ~3 lần bỏ lỡ heartbeat (mặc định heartbeat mỗi 30s)

let entry = null; // { url, at }

function register(url) {
  entry = { url, at: Date.now() };
}

function getFreshUrl() {
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.url;
}

module.exports = { register, getFreshUrl };
