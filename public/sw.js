const CACHE_NAME = 'nsk-challenge-v3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './icon.png',
  './icon.svg',
  './manifest.json',
  './home_bg.jpg',
  './cinematic_bg.jpg',
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate for static assets, network-first for navigation, bypass for Supabase API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Pass-through live API calls (Supabase Cloud, telemetry)
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // 2. Navigation request: Network first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html') || caches.match('/index.html'))
    );
    return;
  }

  // 3. Static assets: Cache first with background update (Stale While Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
