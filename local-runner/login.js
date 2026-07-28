'use strict';
/**
 * Mở Zalo Basso trong persistent context để ĐĂNG NHẬP THỦ CÔNG 1 LẦN.
 * Session sẽ được lưu vào playwright-data/zalo-<profile>/ và dùng lại cho các lần gửi.
 *
 * Chạy:  npm run runner:login                (profile mặc định = "default")
 *        npm run runner:login -- ten_acc     (đăng nhập cho 1 profile khác)
 *
 * Sau khi đăng nhập xong trên cửa sổ browser, GÕ Ctrl+C ở terminal hoặc đóng cửa sổ để kết thúc.
 */
const config = require('./config');
const { getContext } = require('./browser');

(async () => {
  const profile = process.argv[2] || 'default';
  console.log(`[login] Mở Zalo Basso cho profile "${profile}" ...`);
  console.log(`[login] headless=${config.headless} (nên để false để thấy cửa sổ và đăng nhập)`);

  const context = await getContext(profile);
  const page = context.pages()[0] || (await context.newPage());
  console.log(`[login] URL đăng nhập: ${config.saleworkLoginUrl}`);
  await page.goto(config.saleworkLoginUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

  console.log('\n========================================================');
  console.log(' 👉 ĐĂNG NHẬP Zalo Basso trên cửa sổ browser vừa mở.');
  console.log(' 👉 Đăng nhập xong cứ để đó (session đã được lưu tự động).');
  console.log(' 👉 Gõ Ctrl+C tại đây hoặc đóng cửa sổ để kết thúc.');
  console.log('========================================================\n');

  context.on('close', () => { console.log('[login] Đã đóng. Session đã lưu.'); process.exit(0); });
  await new Promise(() => {});
})().catch((err) => {
  console.error('[login] Lỗi:', err.message);
  process.exit(1);
});
