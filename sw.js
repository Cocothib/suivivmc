/* =============================================================
   Service Worker – Suivi VMC PWA
   Strategie :
   - App shell (HTML) : network-first (toujours la derniere version)
   - Fallback sur cache si hors-ligne
   - API Graph Microsoft : network-only (pas de cache API)
   ============================================================= */

const CACHE_NAME = 'vmc-pwa-v22';
const APP_SHELL = ['./index.html', './manifest.json'];

/* --- Installation : pre-cache du shell --- */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

/* --- Activation : nettoyage anciens caches --- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

/* --- Fetch : network-first pour le shell, network-only pour Graph API --- */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ne pas cacher les appels Graph API ni MSAL
    if (url.hostname === 'graph.microsoft.com' ||
        url.hostname === 'login.microsoftonline.com' ||
        url.hostname.endsWith('.microsoft.com')) {
        return; // laisser passer sans interception
    }

    // Network-first : essayer le reseau, fallback sur cache
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
