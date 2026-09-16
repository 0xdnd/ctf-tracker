/* CTF Tracker - service worker: offline app shell + runtime caching */
'use strict';
var CACHE = 'ctf-tracker-v1';
var CORE = [
    './',
    './index.html',
    './ferrofluid.js',
    './manifest.webmanifest',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE)
            .then(function (c) { return c.addAll(CORE); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                    .map(function (k) { return caches.delete(k); }));
            })
            .then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;

    // Navigations: network-first so app updates land on next visit, cache fallback = offline
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then(function (res) {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
                    return res;
                })
                .catch(function () { return caches.match('./index.html'); })
        );
        return;
    }

    // Everything else (fonts, CDN css/js, icons): stale-while-revalidate
    e.respondWith(
        caches.match(e.request).then(function (hit) {
            var net = fetch(e.request).then(function (res) {
                if (res && res.status === 200) {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
                }
                return res;
            }).catch(function () { return hit; });
            return hit || net;
        })
    );
});
