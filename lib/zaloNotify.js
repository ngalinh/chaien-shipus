'use strict';

/**
 * Forward gửi tin "báo ship" qua Zalo tới local-runner (Playwright, chạy trên máy khác có
 * Chrome — xem local-runner/ ở root repo). Backend chỉ gọi HTTP sang runner, không tự động
 * hoá trình duyệt ở đây.
 */

const localRegistry = require('./localRegistry');

// URL runner hiệu lực: ưu tiên URL runner TỰ ĐĂNG KÝ qua /api/register-local (heartbeat —
// dùng khi runner sau NAT/không có IP cố định); nếu chưa có/đã cũ thì rơi về ZALO_RUNNER_URL
// tĩnh trong .env (dùng khi runner có IP/host cố định gọi thẳng được, kể cả chạy cùng máy).
function runnerBaseUrl() {
  const url = localRegistry.getFreshUrl() || process.env.ZALO_RUNNER_URL || 'http://localhost:8091';
  return url.replace(/\/$/, '');
}

const RUNNER_API_KEY = process.env.ZALO_RUNNER_API_KEY || '';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (RUNNER_API_KEY) h['x-api-key'] = RUNNER_API_KEY;
  return h;
}

/**
 * Gửi 1 tin nhắn (và/hoặc 1 ảnh) qua Zalo và chờ kết quả (poll job tới khi xong hoặc timeout).
 * @param {{phone:string, name?:string, message?:string, image?:{name?:string, dataBase64:string}}} p
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function sendZaloMessage({ phone, name, message, image }) {
  const baseUrl = runnerBaseUrl();
  const images = image ? [{ name: image.name, dataBase64: image.dataBase64 }] : undefined;
  const sendRes = await fetch(`${baseUrl}/api/zalo/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ profile: 'default', keyword: phone, name, message, images, notifyTarget: 'personal' }),
  });
  if (!sendRes.ok) {
    const text = await sendRes.text().catch(() => '');
    throw new Error(`Local-runner từ chối (${sendRes.status}): ${text}`);
  }
  const { jobId } = await sendRes.json();
  if (!jobId) throw new Error('Local-runner không trả jobId');

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    let job;
    try {
      const jobRes = await fetch(`${baseUrl}/api/job/${jobId}`, { headers: headers() });
      if (!jobRes.ok) continue;
      ({ job } = await jobRes.json());
    } catch {
      continue; // glitch mạng tạm thời -> thử lại
    }
    if (!job) continue;
    if (job.status === 'done') return { ok: true };
    if (job.status === 'error') return { ok: false, error: job.error };
  }
  return { ok: false, error: 'Hết thời gian chờ local-runner (timeout)' };
}

module.exports = { sendZaloMessage };
