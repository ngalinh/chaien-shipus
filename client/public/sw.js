// Service worker tối thiểu — chỉ để iOS coi Chaien là PWA cài được đầy đủ
// (manifest + SW) → áp theme-color cho status bar giống các app BASSO khác.
// KHÔNG cache gì (network passthrough) để tránh phục vụ bundle cũ khi deploy mới.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // để browser tự xử lý, không can thiệp
