/*
 * Add these event listeners to the EXISTING sw.js; do not replace the file.
 * Keep its current install/activate/fetch listeners intact.
 */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'دفتر الحساب';
  const options = {
    body: data.body || 'يوجد تحديث جديد على حسابك.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/portal.html' },
    tag: data.tag || 'account-update',
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/portal.html', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
