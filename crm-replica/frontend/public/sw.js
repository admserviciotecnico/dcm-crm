const VERSION = 'dcm-crm-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = ['/', '/login', '/offline', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});
