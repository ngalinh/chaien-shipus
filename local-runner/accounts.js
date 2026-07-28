'use strict';
/**
 * Liệt kê các tài khoản Zalo mà 1 profile (phiên đăng nhập Zalo Basso) ĐANG THẤY trong dropdown.
 * Dùng để kiểm tra "profile này đã đăng nhập chưa + có những Zalo nào", và lấy đúng TÊN account
 * để điền vào saleworkName khi thêm account (POST /api/accounts).
 *
 * Chạy trên MÁY RUNNER (nơi có session đã lưu):
 *   npm run runner:accounts              # profile mặc định "default"
 *   npm run runner:accounts -- ten_acc   # profile khác
 */
const config = require('./config');
const { getContext, profileExists } = require('./browser');
const { gotoSalework, ensureLoggedIn, listZaloAccounts } = require('./salework');

(async () => {
  const profile = process.argv[2] || 'default';
  console.log(`[accounts] profile="${profile}" | exists=${profileExists(profile)} | URL=${config.saleworkUrl}`);
  if (!profileExists(profile)) {
    console.error(`[accounts] ❌ Profile "${profile}" chưa có session. Đăng nhập trước: npm run runner:login -- ${profile}`);
    process.exit(2);
  }

  const context = await getContext(profile);
  const page = context.pages()[0] || (await context.newPage());
  try {
    await gotoSalework(page);
    try {
      await ensureLoggedIn(page, { profile });
    } catch (e) {
      console.error(`[accounts] ❌ ${e.message}`);
      process.exit(3);
    }

    const names = await listZaloAccounts(page);
    if (!names.length) {
      console.log('[accounts] ✅ Đã đăng nhập, nhưng KHÔNG đọc được tài khoản nào trong dropdown.');
      console.log('[accounts] -> Có thể giao diện chỉ 1 account, hoặc selector đã đổi. Xem ảnh screenshots/02a-account-search.png.');
    } else {
      console.log(`[accounts] ✅ Đã đăng nhập. Thấy ${names.length} tài khoản Zalo:`);
      names.forEach((n, i) => console.log(`   ${String(i + 1).padStart(2)}. ${n}`));
      console.log('[accounts] Mẹo: copy đúng tên ở trên để điền saleworkName khi thêm account.');
    }
  } finally {
    await context.close().catch(() => {});
  }
  process.exit(0);
})().catch((err) => {
  console.error('[accounts] Lỗi:', err.message);
  process.exit(1);
});
