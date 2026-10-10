/* Auto-updating service worker for Daftar AlHesab.
   App records stay in localStorage under debt_book_v1; cache cleanup never touches them. */
const CACHE_NAME = 'daftar-client-portal-v2';
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
    await Promise.all(keys.filter(key =>
      (key.startsWith('debt-book-shell-') || key.startsWith('daftar-client-portal-')) &&
      key !== CACHE_NAME
    ).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Customer portal must never fall back to the admin index page.
  // Do not cache portal responses as index.html; always request the route from Cloudflare.
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname === '/portal.html' || requestUrl.pathname === '/portal') {
    event.respondWith((async () => {
      try {
        return await fetch(new Request(request, { cache: 'no-store' }));
      } catch (_) {
        return new Response(
          '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>كشف حساب العميل</title><body style="font-family:Arial,sans-serif;padding:24px;line-height:1.8"><h2>تعذّر الاتصال</h2><p>بوابة العميل تحتاج إلى اتصال بالإنترنت. أعد المحاولة عند عودة الاتصال.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        );
      }
    })());
    return;
  }

  if (request.mode === 'navigate' || requestUrl.pathname.endsWith('/index.html') || requestUrl.pathname === '/') {
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
