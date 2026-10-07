// ZeroBox Tactical CTF Tracker — Offline Service Worker
// Versioned precache with offline SPA navigation fallback and zero external egress
const CACHE_VERSION = 'zerobox-v3.2.0';
// /app-shell.html is the SPA shell emitted by scripts/prerender.cjs; / is the static landing page.
const APP_SHELL = '/app-shell.html';
// Hashed JS/CSS referenced by the shell; scripts/prerender.cjs replaces the placeholder at build time.
const SHELL_ASSETS = /*__SHELL_ASSETS__*/[];
const CORE_SHELL = ['/', APP_SHELL, '/manifest.webmanifest', ...SHELL_ASSETS];

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

  // Navigations: network-first, cached under their own URL; offline falls back to that URL, then the app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            // Clone synchronously, before the body is handed to the page
            const pageCopy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, pageCopy);
            });
          }
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(event.request);
          if (exact) return exact;
          // App routes fall back to the SPA shell; the landing page (/) falls back to its own copy first
          const isLanding = url.pathname === '/' || url.pathname === '/index.html';
          const cached = (await caches.match(APP_SHELL)) || (isLanding ? await caches.match('/') : null);
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
