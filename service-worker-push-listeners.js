/*
 * Append these listeners to the existing sw.js.
 * Keep the existing install, activate, and fetch listeners unchanged.
 */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }

  event.waitUntil(self.registration.showNotification(data.title || 'دفتر الحساب', {
    body: data.body || 'يوجد تحديث جديد على حسابك.',
    data: { url: data.url || '/portal.html' },
    tag: data.tag || 'business-account-update',
    renotify: true
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/portal.html', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const win of wins) {
      if (win.url.startsWith(self.location.origin)) {
        await win.focus();
        if ('navigate' in win) await win.navigate(target);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
