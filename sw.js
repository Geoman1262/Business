/* Auto-updating service worker for Daftar AlHesab.
   App records stay in localStorage under debt_book_v1; cache cleanup never touches them. */
const CACHE_NAME = 'daftar-client-portal-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('debt-book-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate' || new URL(request.url).pathname.endsWith('/index.html') || new URL(request.url).pathname === '/') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(new Request(request, { cache: 'no-store' }));
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', fresh.clone()).catch(() => {});
          return fresh;
        }
      } catch (_) {}
      return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
    })());
    return;
  }
  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, fresh.clone())).catch(() => {});
      return fresh;
    } catch (_) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
