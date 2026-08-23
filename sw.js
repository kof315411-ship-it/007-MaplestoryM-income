/* ==========================================================================
   æ¥“ä?è°·M ?›æ??¶ç??†æ???- Service Worker (v14 ç¶²è·¯?ªå? Network-First ç­–ç•¥)
   ========================================================================== */

const CACHE_NAME = 'maplem-income-v14';

self.addEventListener('install', (e) => {
  console.log('[SW v14] Installing and activating immediately...');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v14] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ç¶²è·¯?ªå? (Network First) ç­–ç•¥ï¼šç¢ºä¿æ?ä¸€æ¬¡é??Ÿå??–å??€?°ç? app.js
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
