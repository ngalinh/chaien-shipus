'use strict';
/**
 * start.js — Launcher cho local-runner (chạy trên MÁY CÓ CHROME — máy riêng, khác với
 * VPS chạy backend chaien-shipus).
 *
 * 1. Spawn local-runner/index.js như tiến trình con, group-leader riêng để lúc tắt kill được
 *    CẢ NHÓM (kể cả Chrome do Playwright đẻ ra) — tránh Chrome mồ côi giữ cổng/SingletonLock
 *    khiến instance mới EADDRINUSE và pm2 restart treo.
 * 2. Tự xác định URL công khai của runner (tunnel/IP) rồi POST lên backend chaien-shipus qua
 *    /api/register-local, heartbeat định kỳ (backend lưu URL trong RAM nên cần nhắc lại đều).
 *    Nhờ vậy KHÔNG cần hardcode ZALO_RUNNER_URL tĩnh khi máy runner sau NAT/IP hay đổi. Nếu
 *    máy runner có IP/host cố định gọi thẳng được, có thể bỏ qua đăng ký và chỉ cần đặt
 *    ZALO_RUNNER_URL tĩnh trong .env của backend — lib/zaloNotify.js tự rơi về giá trị đó
 *    khi chưa/hết hạn đăng ký.
 *
 * Dùng: `node start.js`  (hoặc `npm run runner`)
 */
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const REMOTE_BACKEND_URL = (process.env.CHAIEN_REMOTE_BACKEND_URL || '').trim().replace(/\/$/, '');
const API_KEY = process.env.CHAIEN_ZALO_API_KEY || '';
const LOCAL_PORT = parseInt(process.env.CHAIEN_ZALO_PORT || '8091', 10);
const REGISTER_INTERVAL_MS = Math.max(
  parseInt(process.env.CHAIEN_REGISTER_INTERVAL_MS || '30000', 10) || 30000,
  5000
);

function isLocalhost(u) {
  return /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(u || '');
}

/** Xác định URL công khai của runner để khai báo lên backend. */
async function resolveLocalUrl() {
  // 1) Ưu tiên URL công khai chỉ định rõ (tunnel ngrok/cloudflared, hoặc IP LAN cố định).
  const explicit = (process.env.CHAIEN_ZALO_PUBLIC_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');

  // 2) Tự dò IP public rồi ghép cổng (cần mở/forward cổng thì backend mới gọi vào được).
  try {
    const res = await fetch('https://api.ipify.org', { signal: AbortSignal.timeout(5000) });
    const ip = (await res.text()).trim();
    if (ip) return `http://${ip}:${LOCAL_PORT}`;
  } catch {
    /* bỏ qua, xử lý ở dưới */
  }
  return '';
}

async function registerUrl(url, { silent = false } = {}) {
  if (!REMOTE_BACKEND_URL) {
    if (!silent) console.warn('[start] Chưa đặt CHAIEN_REMOTE_BACKEND_URL — bỏ qua đăng ký (runner vẫn chạy, cần ZALO_RUNNER_URL tĩnh bên backend).');
    return false;
  }
  if (!url || isLocalhost(url)) {
    if (!silent) console.warn('[start] Không xác định được URL công khai của runner để đăng ký (đặt CHAIEN_ZALO_PUBLIC_URL nếu tự dò IP thất bại).');
    return false;
  }
  try {
    const res = await fetch(`${REMOTE_BACKEND_URL}/api/register-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, apiKey: API_KEY }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      if (!silent) console.warn(`[start] Đăng ký thất bại (${res.status}): ${t}`);
      return false;
    }
    if (!silent) console.log(`[start] Đã đăng ký runner: ${url} -> ${REMOTE_BACKEND_URL}`);
    return true;
  } catch (e) {
    if (!silent) console.warn(`[start] Lỗi đăng ký: ${e.message}`);
    return false;
  }
}

// ---- Spawn local-runner ----
// detached:true -> local-runner (và Chrome do Playwright đẻ ra) nằm trong 1 NHÓM TIẾN TRÌNH
// riêng. Nhờ vậy lúc tắt ta kill được CẢ NHÓM bằng process.kill(-pid) — kể cả Chrome "cháu".
const child = spawn('node', [path.join(__dirname, 'local-runner', 'index.js')], {
  stdio: 'inherit',
  env: process.env,
  detached: true,
});
let shuttingDown = false;
child.on('exit', (code) => {
  if (shuttingDown) return;
  console.log(`[start] local-runner thoát (code=${code}). Dừng launcher.`);
  process.exit(code == null ? 0 : code);
});

// ---- Đăng ký lần đầu + heartbeat ----
(async () => {
  const url = await resolveLocalUrl();
  await registerUrl(url);
})();

const timer = setInterval(async () => {
  const url = await resolveLocalUrl();
  if (url) await registerUrl(url, { silent: true });
}, REGISTER_INTERVAL_MS);

// ---- Tắt mượt ----
function killGroup(signal) {
  try { process.kill(-child.pid, signal); }
  catch { try { child.kill(signal); } catch { /* đã chết */ } }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);

  // 1) Xin local-runner tự đóng Chrome + HTTP server cho sạch (SIGTERM).
  killGroup('SIGTERM');

  // 2) Con chết hẳn -> mới thoát, để cổng + ống stdio đã giải phóng trước khi pm2 dựng
  //    instance mới (không còn EADDRINUSE / restart loop).
  const force = setTimeout(() => {
    console.warn('[start] local-runner không chịu thoát trong 8s — SIGKILL cả nhóm.');
    killGroup('SIGKILL');
    process.exit(1);
  }, 8000);
  if (typeof force.unref === 'function') force.unref();

  child.once('exit', (code) => {
    clearTimeout(force);
    process.exit(code == null ? 0 : code);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
