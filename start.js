'use strict';
/**
 * start.js — Launcher cho local-runner (chạy trên MÁY CÓ CHROME, cùng máy mi-runner).
 *
 * Spawn local-runner/index.js như tiến trình con, group-leader riêng để lúc tắt kill được
 * CẢ NHÓM (kể cả Chrome do Playwright đẻ ra) — tránh Chrome mồ côi giữ cổng/SingletonLock
 * khiến instance mới EADDRINUSE và pm2 restart treo.
 *
 * Backend chaien-shipus gọi thẳng http://localhost:<CHAIEN_ZALO_PORT> (cùng máy) nên KHÔNG
 * cần đăng ký URL lên server nào — khác với launcher của mi (không có REMOTE_BOT_URL ở đây).
 *
 * Dùng: `node start.js`  (hoặc `npm run runner`)
 */
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

function killGroup(signal) {
  try { process.kill(-child.pid, signal); }
  catch { try { child.kill(signal); } catch { /* đã chết */ } }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

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
