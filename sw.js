/* ==========================================================================
   楓之谷M 掛機收益分析器 - Service Worker (離線快取與跨裝置支援)
   ========================================================================== */

const CACHE_NAME = 'maplem-income-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/fontawesome/6.5.1/css/all.min.css'
];

// 安裝 Service Worker 並預先快取檔案
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('[SW] Cache partial:', err));
    })
  );
  self.skipWaiting();
});

// 啟動與清除舊快取
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截網路請求，優先從快取讀取 (Cache First)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        return networkResponse;
      });
    }).catch(() => fetch(e.request))
  );
});
