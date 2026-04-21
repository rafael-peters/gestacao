/**
 * Service Worker — IG-avancada
 * Estratégia: cache-first para shell + network-first para HTML (com fallback cache)
 */
const CACHE_VERSION = 'ig-avancada-v2';
// SHELL com caminhos relativos ao escopo do service worker (mesma pasta do sw.js)
const SHELL = [
    './',
    './index.html',
    './manifest.json',
    '../assets/css/ig-avancada.css',
    '../assets/js/core/biometria.js',
    '../assets/js/core/ga-methods.js',
    '../assets/js/core/timeline.js',
    '../assets/js/pages/ig-avancada.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin && !url.hostname.includes('fonts.googleapis.com') && !url.hostname.includes('fonts.gstatic.com')) return;

    const isDoc = req.mode === 'navigate' || (req.destination === 'document');

    if (isDoc) {
        // Network-first com fallback ao cache (para pegar updates do HTML)
        event.respondWith(
            fetch(req).then((res) => {
                const clone = res.clone();
                caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
                return res;
            }).catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
        );
        return;
    }

    // Cache-first para assets
    event.respondWith(
        caches.match(req).then((hit) => hit || fetch(req).then((res) => {
            if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
            }
            return res;
        }).catch(() => caches.match(req)))
    );
});
