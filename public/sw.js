// File: public/sw.js
const CACHE_NAME = 'bunkd-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.svg',
];

// Install Event - Pre-cache Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy for Offline Support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests, Firebase / Google API calls (let Firebase SDK handle its own offline persistence)
  if (
    request.method !== 'GET' || 
    url.origin.includes('firestore.googleapis.com') || 
    url.origin.includes('firebase') || 
    url.origin.includes('googleapis') ||
    url.origin.includes('identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('Network fetch failed, serving from cache.', err);
          // If offline and request is a navigation request, fallback to root or login
          if (request.mode === 'navigate') {
            return cache.match('/') || cache.match('/login');
          }
        });

        // Return cached version immediately if exists, otherwise wait for network fetch
        return cachedResponse || fetchPromise;
      });
    })
  );
});
