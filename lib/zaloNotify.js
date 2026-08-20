'use strict';

/**
 * Forward gửi tin "báo ship" qua Zalo tới local-runner (Playwright, chạy trên máy khác có
 * Chrome — xem local-runner/ ở root repo). Backend chỉ gọi HTTP sang runner, không tự động
 * hoá trình duyệt ở đây.
 */

const localRegistry = require('./localRegistry');
const db = require('../db');
const { normPhone } = require('./phone');

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

/** Gửi 1 lượt tới runner với notifyTarget cho trước, poll job tới khi xong hoặc timeout. */
async function sendOnce(baseUrl, { phone, name, message, images, renderUrl, notifyTarget }) {
  const sendRes = await fetch(`${baseUrl}/api/zalo/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ profile: 'default', keyword: phone, name, message, images, renderUrl, notifyTarget }),
  });
  if (!sendRes.ok) {
    const text = await sendRes.text().catch(() => '');
    throw new Error(`Local-runner từ chối (${sendRes.status}): ${text}`);
  }
  const { jobId } = await sendRes.json();
  if (!jobId) throw new Error('Local-runner không trả jobId');

  // renderUrl tốn thêm thời gian mở trang + đợi render trước khi runner mới bắt đầu gửi -> nới
  // deadline poll để không báo timeout giả trong lúc job vẫn đang chạy bình thường.
  const deadline = Date.now() + (renderUrl ? 90_000 : 60_000);
  let lastStatus = null; // trạng thái job lần poll gần nhất -> ghi vào lỗi timeout để dễ chẩn đoán
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
    lastStatus = job.status;
    if (job.status === 'done') return { ok: true };
    if (job.status === 'error') return { ok: false, error: job.error };
  }
  return { ok: false, error: `Hết thời gian chờ local-runner (timeout, job đang ở trạng thái: ${lastStatus || 'không rõ'})` };
}

// Danh bạ Zalo (Cài đặt -> Danh bạ Zalo): tra theo SĐT đã chuẩn hoá để lấy tên hội thoại
// Zalo (ghi đè name khi runner tìm bằng tên khách không ra) + cách gửi ưu tiên riêng cho
// khách này (ghi đè thứ tự group-trước/personal-sau mặc định).
function findContact(phone) {
  const key = normPhone(phone);
  if (!key) return null;
  return db.prepare('SELECT * FROM zalo_contacts WHERE phone = ?').get(key);
}

/** Thử lần lượt các notifyTarget cho tới khi thành công hoặc hết lỗi KHONG_THAY_HOI_THOAI. */
async function attemptTargets(baseUrl, params, targets) {
  let result;
  for (const notifyTarget of targets) {
    // eslint-disable-next-line no-await-in-loop
    result = await sendOnce(baseUrl, { ...params, notifyTarget });
    if (result.ok || !/KHONG_THAY_HOI_THOAI/.test(result.error || '')) return result;
  }
  return result;
}

/**
 * Gửi 1 tin nhắn (và/hoặc 1 ảnh, và/hoặc 1 trang "in phiếu" để runner tự chụp — xem
 * local-runner/browser.js#renderPrintPage) qua Zalo và chờ kết quả (poll job tới khi xong
 * hoặc timeout). Mặc định ưu tiên tìm hội thoại NHÓM của khách trước; nếu khách không có
 * nhóm (runner báo KHONG_THAY_HOI_THOAI) mới rơi về tìm hội thoại CÁ NHÂN — trừ khi Danh bạ
 * Zalo có cấu hình report_target riêng cho SĐT này thì chỉ gửi đúng kiểu đó.
 *
 * Danh bạ Zalo có zalo_name cho SĐT này -> tìm THẲNG bằng đúng tên hội thoại đó (bỏ qua lượt
 * tìm theo SĐT khách) — dùng cho case nhiều khách cùng báo chung 1 nhóm/tài khoản Zalo (vd của
 * người thân) mà chính SĐT của họ không tra ra hội thoại đó trên Zalo.
 * @param {{phone:string, name?:string, message?:string, image?:{name?:string, dataBase64:string}, renderUrl?:string}} p
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function sendZaloMessage({ phone, name, message, image, renderUrl }) {
  const baseUrl = runnerBaseUrl();
  const images = image ? [{ name: image.name, dataBase64: image.dataBase64 }] : undefined;
  const contact = findContact(phone);
  const targets = contact && contact.report_target ? [contact.report_target] : ['group', 'personal'];

  if (contact && contact.zalo_name) {
    return attemptTargets(baseUrl, { phone: '', name: contact.zalo_name, message, images, renderUrl }, targets);
  }
  return attemptTargets(baseUrl, { phone, name, message, images, renderUrl }, targets);
}

module.exports = { sendZaloMessage };
