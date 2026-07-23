// Service worker Chaien — network-first cho điều hướng.
//
// Lý do: BASSO serve index.html KHÔNG kèm Cache-Control: no-store (chỉ có ETag),
// nên Safari/PWA dễ cache lại bản index.html CŨ và kẹt ở đó — PWA không refresh
// được nên status bar/header giữ nguyên bản lỗi cũ. Ép tải index.html tươi mỗi
// lần điều hướng sẽ luôn lấy meta mới nhất. (Cơ chế giống app Deki đang chạy đúng.)
//
// Asset (JS/CSS) đặt tên theo content-hash → immutable → để browser tự cache, an toàn.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method === 'GET' && req.mode === 'navigate') {
    // cache: 'reload' = bỏ qua HTTP cache, buộc tải index.html mới từ server
    event.respondWith(fetch(req, { cache: 'reload' }).catch(() => fetch(req)));
  }
});
