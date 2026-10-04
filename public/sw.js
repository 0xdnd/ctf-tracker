// ZeroBox Tactical CTF Tracker — Offline Service Worker
// Versioned precache with offline SPA navigation fallback and zero external egress
const CACHE_VERSION = 'zerobox-v2.1.0';
const CORE_SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(CORE_SHELL);
      // Skip waiting to immediately activate for offline readiness
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up only our old ZeroBox versioned caches
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith('zerobox-') && key !== CACHE_VERSION) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strict Zero-Egress Air-Gap invariant: Never intercept or proxy cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // SPA navigation fallback: when online, fetch fresh index.html; when offline, serve cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('./index.html');
          return cached || Response.error();
        })
    );
    return;
  }

  // Same-origin asset caching:
  // Hashed build assets in /assets/ are immutable -> Cache-First
  // Other resources -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((hit) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => hit);

      if (url.pathname.includes('/assets/')) {
        return hit || fetchPromise;
      }
      return hit ? fetchPromise.then((fresh) => fresh || hit).catch(() => hit) : fetchPromise;
    })
  );
});
