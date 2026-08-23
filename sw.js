/* ==========================================================================
   楓之谷M 掛機收益分析器 - Service Worker (v11 網路優先 Network-First 策略)
   ========================================================================== */

const CACHE_NAME = 'maplem-income-v11';

self.addEventListener('install', (e) => {
  console.log('[SW v11] Installing and activating immediately...');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v11] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 網路優先 (Network First) 策略：確保每一次開啟均取得最新版 app.js
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && e.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
