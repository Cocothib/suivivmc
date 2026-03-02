/* =============================================================
   Service Worker – Suivi VMC PWA
   Strategie :
   - App shell (HTML) : cache-first avec refresh en arriere-plan
   - API Graph Microsoft : network-only (pas de cache API)
   ============================================================= */

const CACHE_NAME = 'vmc-pwa-v1';
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

/* --- Fetch : cache-first pour le shell, network-only pour Graph API --- */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ne pas cacher les appels Graph API ni MSAL
    if (url.hostname === 'graph.microsoft.com' ||
        url.hostname === 'login.microsoftonline.com' ||
        url.hostname.endsWith('.microsoft.com')) {
        return; // laisser passer sans interception
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Stale-while-revalidate : retourner le cache, puis mettre a jour
            const networkFetch = fetch(event.request).then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached); // si offline, on a deja retourne le cache

            return cached || networkFetch;
        })
    );
});
