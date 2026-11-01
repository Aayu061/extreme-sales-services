// Service Worker for Extreme Sales & Services PWA (Offline Resilient)
const CACHE_NAME = 'ess-pwa-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/technician.html',
    '/status.html',
    '/service.html',
    '/products.html',
    '/css/custom.css',
    '/js/technician.js',
    '/js/login.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Pre-caching non-fatal asset miss:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests for static pages and assets, skip API routes
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Stale-while-revalidate: update cache
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                }
                return networkResponse;
            })
            .catch(() => {
                // Offline fallback from cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/technician.html') || caches.match('/index.html');
                    }
                });
            })
    );
});
