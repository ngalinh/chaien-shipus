'use strict';
// Bắt log hệ thống của runner (nơi Chrome/Playwright hay crash) vào ring buffer, xem qua
// /api/system-logs mà không cần SSH vào máy đọc file PM2. Gọi sớm nhất có thể.
const logBuffer = require('./logBuffer');
logBuffer.install();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const config = require('./config');
const { createJob, getJob } = require('./jobQueue');
const { sendBaoHang, checkLoggedIn } = require('./salework');
const { profileExists, profilePath, openForLogin, closeAll, renderPrintPage } = require('./browser');
const accountsStore = require('./accountsStore');
const testModeStore = require('./testModeStore');
const loginHistory = require('./loginHistory');
const sessionKeeper = require('./sessionKeeper');

// Thông tin tự điền form login khi mở Chromium (Zalo Basso dùng ô text đầu + ô mật khẩu).
const loginPrefill = (a) =>
  (a && a.password) ? { email: a.email || '', password: a.password } : null;

const app = express();
app.use(express.json({ limit: '8mb' }));

// So sánh secret theo thời gian hằng định (chống dò timing). Khác độ dài -> false.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// --- Xác thực bằng x-api-key (trừ /health) ---
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!config.apiKey) return next(); // chưa đặt key => bỏ qua (dev)
  if (!safeEqual(req.get('x-api-key'), config.apiKey)) {
    return res.status(401).json({ ok: false, error: 'Sai hoặc thiếu x-api-key' });
  }
  next();
});

app.get('/health', (req, res) => {
  const tm = testModeStore.get();
  res.json({
    ok: true,
    service: 'chaien-zalo-runner',
    testMode: tm.testMode,
    testPhones: tm.testPhones,
    time: new Date().toISOString(),
  });
});

/** GET /api/test-mode — trạng thái chặn an toàn hiện tại (testMode + testPhones). */
app.get('/api/test-mode', (req, res) => {
  res.json({ ok: true, ...testModeStore.get() });
});

/**
 * GET /api/system-logs — log hệ thống của RUNNER (crash Chrome/Playwright, lỗi gửi…) từ ring
 * buffer trong RAM. Query: level (error|warn), q (tìm chuỗi), limit (số dòng).
 */
app.get('/api/system-logs', (req, res) => {
  const { level, q, limit } = req.query;
  res.json({ ok: true, source: 'runner', entries: logBuffer.getEntries({ level, q, limit }) });
});

/**
 * PUT /api/test-mode — bật/tắt chặn an toàn và/hoặc đổi danh sách SĐT được gửi.
 * body: { testMode?: boolean, testPhones?: string|string[] }. Ghi ra file -> hiệu lực NGAY.
 */
app.put('/api/test-mode', (req, res) => {
  const { testMode, testPhones } = req.body || {};
  try {
    const next = testModeStore.set({ testMode, testPhones });
    res.json({ ok: true, ...next });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/profile/:name', (req, res) => {
  res.json({ ok: true, profile: req.params.name, exists: profileExists(req.params.name) });
});

const TMP_IMAGE_DIR = path.join(config.dataDir, '..', 'tmp-images');

/**
 * Ghi ảnh base64 (gửi qua network — backend không có file cục bộ như imagePaths) ra file
 * tạm, trả về đường dẫn để dùng như imagePaths. Ném lỗi nếu ghi thất bại.
 * @param {{name?:string, dataBase64:string}[]} images
 * @returns {string[]}
 */
function writeTempImages(images) {
  if (!fs.existsSync(TMP_IMAGE_DIR)) fs.mkdirSync(TMP_IMAGE_DIR, { recursive: true });
  return images.map((img, i) => {
    const ext = (img.name && path.extname(img.name)) || '.png';
    const filePath = path.join(TMP_IMAGE_DIR, `${Date.now()}-${i}${ext}`);
    const base64 = String(img.dataBase64 || '').replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return filePath;
  });
}

/**
 * POST /api/zalo/send
 * body: { profile, account?, keyword, name?, message?, strictMatch?, imagePaths?, images?,
 *         renderUrl?, notifyTarget?, keepContext? }
 * imagePaths = đường dẫn file CÓ SẴN trên máy runner. images = ảnh base64 gửi qua network
 * (vd từ backend) — runner tự ghi ra file tạm rồi xoá sau khi gửi xong. renderUrl = URL trang
 * "in phiếu" bên chaien-shipus (vd /print/arrival/...) — runner tự mở bằng browser headless
 * riêng, đợi trang render xong rồi lấy ảnh, dùng cho bot tự động (không có trình duyệt NV nào
 * để html2canvas chạy sẵn). => trả { ok, jobId } ngay; poll /api/job/:id để lấy kết quả.
 */
app.post('/api/zalo/send', (req, res) => {
  const { profile, account, keyword, name, message, strictMatch, imagePaths, images, renderUrl, notifyTarget, keepContext } = req.body || {};
  const hasImages = (Array.isArray(imagePaths) && imagePaths.length) || (Array.isArray(images) && images.length) || !!renderUrl;
  if ((!keyword && !name) || (!message && !hasImages)) {
    return res.status(400).json({ ok: false, error: 'Thiếu (keyword/name) hoặc (message/imagePaths/images/renderUrl)' });
  }

  const jobId = createJob(
    { profile, account, keyword, name, message, strictMatch, imagePaths: imagePaths || [], images, renderUrl, notifyTarget, keepContext },
    async (payload) => {
      const { images: imgs, renderUrl: rUrl, imagePaths: basePaths, ...rest } = payload;
      const tempPaths = [];
      try {
        if (Array.isArray(imgs) && imgs.length) tempPaths.push(...writeTempImages(imgs));
        if (rUrl) {
          const dataUrl = await renderPrintPage(rUrl);
          tempPaths.push(...writeTempImages([{ name: 'phieu-bao-hang-ve.png', dataBase64: dataUrl }]));
        }
        return await sendBaoHang({ ...rest, imagePaths: [...basePaths, ...tempPaths] });
      } finally {
        for (const p of tempPaths) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
      }
    }
  );
  res.json({ ok: true, jobId });
});

app.get('/api/job/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Không tìm thấy job' });
  res.json({ ok: true, job });
});

// ============================================================================
// QUẢN LÝ TÀI KHOẢN ZALO. "key" của account cũng là tên profile browser
// (playwright-data/zalo-<key>).
// ============================================================================

function connectionStatus(key) {
  if (!profileExists(key)) return 'never';
  const last = loginHistory.latest(key);
  if (last && last.type === 'session_expired') return 'expired';
  return 'connected';
}

function decorate(a) {
  // KHÔNG trả `password` ra API: chỉ dùng nội bộ để tự điền form login khi mở Chromium.
  const { password, ...safe } = a;
  return { ...safe, loggedIn: profileExists(a.key), connection: connectionStatus(a.key) };
}

/** GET /api/accounts — liệt kê tài khoản Zalo + cờ đăng nhập + trạng thái kết nối. */
app.get('/api/accounts', (req, res) => {
  const accounts = accountsStore.list().map(decorate);
  res.json({ ok: true, accounts });
});

/**
 * POST /api/accounts — thêm tài khoản Zalo rồi mở Chromium để đăng nhập.
 * body: { key, name, saleworkName, email?, password?, phone?, staffId?, brand?, autoEnabled?, proxy?, notifyTarget? }
 */
app.post('/api/accounts', (req, res) => {
  const { key, name, saleworkName, email, password, phone, staffId, brand, autoEnabled, proxy, notifyTarget } = req.body || {};
  let account;
  try {
    account = accountsStore.add({ key, name, saleworkName, email, password, phone, staffId, brand, autoEnabled, proxy, notifyTarget });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  const already = profileExists(account.key);
  res.json({
    ok: true,
    account: decorate(account),
    message: already
      ? `Đã thêm tài khoản Zalo "${account.name}". Profile đã có session — xoá rồi thêm lại nếu muốn setup lại.`
      : `Đang mở Chromium để đăng nhập Zalo Basso và chọn tài khoản "${account.name}". Chọn xong thì đóng cửa sổ.`,
  });

  // Chưa có session -> mở Chromium cho nhân viên đăng nhập thủ công (không chặn response).
  if (!already) {
    openForLogin(account.key, config.saleworkLoginUrl, (ev) => {
      if (ev === 'opened') loginHistory.add(account.key, account.name, 'login', 'Mở Chromium để đăng nhập Zalo');
      else loginHistory.add(account.key, account.name, 'login', 'Đã đóng cửa sổ — session đã lưu');
    }, loginPrefill(account)).catch((e) => console.error(`[accounts] mở Chromium lỗi: ${e.message}`));
  }
});

/** PUT /api/accounts/:key — sửa thông tin account (không đổi key). */
app.put('/api/accounts/:key', (req, res) => {
  const { key } = req.params;
  const { name, saleworkName, email, password, phone, staffId, brand, autoEnabled, proxy, notifyTarget } = req.body || {};
  const patch = {};
  for (const [k, v] of Object.entries({ name, saleworkName, email, password, phone, staffId, brand, autoEnabled, proxy, notifyTarget })) {
    if (v !== undefined) patch[k] = v;
  }
  const updated = accountsStore.update(key, patch);
  if (!updated) return res.status(404).json({ ok: false, error: `Không tìm thấy tài khoản "${key}"` });
  res.json({ ok: true, account: decorate(updated) });
});

/** POST /api/accounts/:key/login — mở lại Chromium cho profile có sẵn để đăng nhập lại. */
app.post('/api/accounts/:key/login', (req, res) => {
  const { key } = req.params;
  const account = accountsStore.get(key);
  if (!account) return res.status(404).json({ ok: false, error: `Không tìm thấy tài khoản "${key}"` });

  res.json({ ok: true, message: `Đang mở Chromium cho "${account.name}". Đăng nhập xong thì đóng cửa sổ.` });
  openForLogin(key, config.saleworkLoginUrl, (ev) =>
    loginHistory.add(key, account.name, 'login', ev === 'opened' ? 'Mở lại để đăng nhập' : 'Đã đóng — session đã lưu'), loginPrefill(account))
    .catch((e) => console.error(`[accounts] re-login lỗi: ${e.message}`));
});

/** POST /api/accounts/:key/check — kiểm tra profile còn đăng nhập không (mở browser). */
app.post('/api/accounts/:key/check', async (req, res) => {
  const { key } = req.params;
  const account = accountsStore.get(key);
  if (!account) return res.status(404).json({ ok: false, error: `Không tìm thấy tài khoản "${key}"` });
  if (!profileExists(key)) {
    return res.json({ ok: true, loggedIn: false, connection: 'never', error: 'Chưa từng đăng nhập' });
  }
  try {
    const r = await checkLoggedIn(key);
    loginHistory.add(key, account.name, r.loggedIn ? 'session_ok' : 'session_expired', r.error || '');
    res.json({ ok: true, loggedIn: r.loggedIn, connection: r.loggedIn ? 'connected' : 'expired', error: r.error || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** GET /api/accounts/:key/history — lịch sử đăng nhập của 1 profile. */
app.get('/api/accounts/:key/history', (req, res) => {
  res.json({ ok: true, history: loginHistory.list(req.params.key) });
});

/** DELETE /api/accounts/:key — xoá tài khoản kèm xoá thư mục profile session. */
app.delete('/api/accounts/:key', (req, res) => {
  const { key } = req.params;
  const account = accountsStore.get(key);
  const removed = accountsStore.remove(key);
  if (!removed) return res.status(404).json({ ok: false, error: `Không tìm thấy tài khoản "${key}"` });

  // Xoá luôn thư mục session (an toàn: chỉ xoá trong dataDir). Để bỏ qua, gửi ?keepProfile=1.
  if (req.query.keepProfile !== '1') {
    try {
      const dir = profilePath(key);
      if (dir.startsWith(config.dataDir) && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`[accounts] xoá profile dir lỗi: ${e.message}`);
    }
  }
  loginHistory.add(key, account ? account.name : key, 'delete', 'Đã xoá tài khoản');
  res.json({ ok: true, message: `Đã xoá tài khoản Zalo "${key}"` });
});

// Fail-closed: production / REQUIRE_API_KEY bắt buộc phải có API_KEY (nếu không, mọi endpoint
// điều khiển browser sẽ mở toang). Dừng hẳn thay vì chạy không bảo vệ.
if (config.requireApiKey && !config.apiKey) {
  console.error('[local-runner] FATAL: REQUIRE_API_KEY/production nhưng chưa đặt CHAIEN_ZALO_API_KEY. Đặt rồi chạy lại.');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`[local-runner] listening on http://localhost:${config.port}`);
  console.log(`[local-runner] Zalo URL: ${config.saleworkUrl} | headless=${config.headless}`);
  if (!config.apiKey) console.warn('[local-runner] CẢNH BÁO: chưa đặt CHAIEN_ZALO_API_KEY — endpoint không được bảo vệ.');
  const tm = testModeStore.get();
  if (tm.testMode) {
    console.warn(`[local-runner] 🧪 TEST_MODE BẬT — chỉ gửi tới: ${tm.testPhones.join(', ') || '(trống!)'}`);
  } else {
    console.warn('[local-runner] ⚠️  TEST_MODE TẮT — sẽ gửi tới TẤT CẢ số được yêu cầu (khách thật).');
  }
  // Giữ ấm session Zalo (tự đăng nhập lại trước khi hết hạn ~1 tuần) — no-op nếu tắt.
  sessionKeeper.start();
});

// ============================================================================
// TẮT MƯỢT (fix pm2 restart treo).
// Không bắt tín hiệu -> khi pm2/start.js gửi SIGINT/SIGTERM, bộ xử lý mặc định của Playwright
// cố đóng Chrome; Chrome treo là kẹt luôn tiến trình -> giữ cổng -> instance mới EADDRINUSE ->
// pm2 restart loop. Nay ta tự đóng server + mọi context Chrome, có HẠN CỨNG để không bao giờ treo.
// ============================================================================
let shuttingDown = false;
async function gracefulShutdown(sig) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[local-runner] nhận ${sig} — đang đóng server + trình duyệt...`);
  const hard = setTimeout(() => {
    console.warn('[local-runner] đóng quá lâu — thoát cưỡng bức.');
    process.exit(0);
  }, 6000);
  if (typeof hard.unref === 'function') hard.unref();
  try { server.close(); } catch { /* ignore */ }
  try { await closeAll(); } catch { /* ignore */ }
  clearTimeout(hard);
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
