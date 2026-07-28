'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: parseInt(process.env.CHAIEN_ZALO_PORT || '8091', 10),
  apiKey: process.env.CHAIEN_ZALO_API_KEY || '',
  // Bắt buộc có API_KEY (fail-closed) khi production / REQUIRE_API_KEY=true. Dev vẫn chạy được khi trống.
  requireApiKey: String(process.env.CHAIEN_ZALO_REQUIRE_API_KEY || '').toLowerCase() === 'true'
    || process.env.NODE_ENV === 'production',
  // Trang quản lý Zalo (self-hosted, giao diện Vuetify).
  saleworkUrl: process.env.CHAIEN_ZALO_URL || 'https://zalo.basso.vn',
  // Trang chat (dropdown chọn tài khoản + danh sách hội thoại). Mở mỗi lần gửi tin.
  saleworkChatUrl: process.env.CHAIEN_ZALO_CHAT_URL
    || `${(process.env.CHAIEN_ZALO_URL || 'https://zalo.basso.vn').replace(/\/+$/, '')}/chat`,
  // Tài khoản Zalo chọn trước khi gửi, khi 1 login có nhiều Zalo. Trống = dùng account đang active.
  defaultZaloAccount: process.env.CHAIEN_DEFAULT_ZALO_ACCOUNT || '',
  saleworkLoginUrl: process.env.CHAIEN_ZALO_LOGIN_URL || process.env.CHAIEN_ZALO_URL || 'https://zalo.basso.vn',
  // Tài khoản/mật khẩu ĐĂNG NHẬP TỰ ĐỘNG dùng chung cho MỌI profile chưa gán credential riêng.
  // Session Zalo Basso chỉ giữ ~1 tuần; để trống = không tự đăng nhập (chạy `npm run runner:login` tay).
  saleworkLoginUser: process.env.CHAIEN_ZALO_LOGIN_USER || '',
  saleworkLoginPass: process.env.CHAIEN_ZALO_LOGIN_PASS || '',
  // Giữ ấm session (tự đăng nhập lại trước khi hết hạn). Mặc định BẬT.
  sessionKeepalive: String(process.env.CHAIEN_SESSION_KEEPALIVE || 'true').toLowerCase() === 'true',
  sessionKeepaliveMs: parseInt(process.env.CHAIEN_SESSION_KEEPALIVE_MS || String(12 * 60 * 60 * 1000), 10),
  headless: String(process.env.CHAIEN_ZALO_HEADLESS || 'false').toLowerCase() === 'true',
  // Làm chậm mỗi thao tác (ms) — chỉ để debug. Đặt 0 khi chạy thật.
  slowMo: parseInt(process.env.CHAIEN_ZALO_SLOW_MO || '0', 10),
  // Gửi xong thì đóng trình duyệt (giải phóng tài nguyên).
  closeAfterSend: String(process.env.CHAIEN_ZALO_CLOSE_AFTER_SEND || 'true').toLowerCase() === 'true',
  // CHẾ ĐỘ TEST: chỉ gửi thật tới các số trong TEST_PHONES; số khác bị chặn (không gửi).
  testMode: String(process.env.CHAIEN_ZALO_TEST_MODE || 'true').toLowerCase() === 'true',
  testPhones: (process.env.CHAIEN_ZALO_TEST_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Nơi lưu session đăng nhập theo từng "profile" (account zalo).
  dataDir: path.join(__dirname, '..', 'playwright-data'),
  screenshotDir: path.join(__dirname, '..', 'screenshots'),
  // File lưu danh sách tài khoản Zalo (key, name, saleworkName, proxy) — quản lý qua /api/accounts.
  zaloAccountsFile: path.join(__dirname, '..', 'config', 'zalo-accounts.json'),
  // File override chế độ TEST an toàn (testMode + testPhones) — chỉnh qua UI, hiệu lực ngay.
  testModeFile: path.join(__dirname, '..', 'config', 'test-mode.json'),
};
