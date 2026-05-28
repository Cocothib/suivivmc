/* =============================================================
   Service Worker – Suivi VMC PWA (Version Optimisée)
   Stratégie :
   - App shell (HTML, CSS, JS) : network-first (fallback sur cache)
   - CDN (Bootstrap, MSAL, etc.) : cache-first (pour le hors-ligne)
   - API Graph Microsoft : network-only (pas de cache)
   ============================================================= */

const CACHE_NAME = 'vmc-pwa-v32';
const APP_SHELL = [
    './index.html',
    './manifest.json',
    './styles.css',
    './app.js',
    // Ressources CDN à mettre en cache pour le hors-ligne
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://alcdn.msauth.net/browser/2.10.0/js/msal-browser.min.js',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css',
    'https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js',
    'https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js',
    'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
];

/* --- Installation : pre-cache du shell et des CDN --- */
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

/* --- Fetch : stratégie adaptée --- */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ne pas cacher les appels Graph API ni MSAL
    if (url.hostname === 'graph.microsoft.com' ||
        url.hostname === 'login.microsoftonline.com' ||
        url.hostname.endsWith('.microsoft.com')) {
        return; // laisser passer sans interception
    }

    // Cache-first pour les ressources CDN et locales
    if (APP_SHELL.includes(url.href) || 
        APP_SHELL.includes(url.pathname) ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    const clone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return fetchResponse;
                });
            })
        );
    }
    // Network-first pour le reste
    else {
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
    }
});