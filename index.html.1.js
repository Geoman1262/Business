
// Register the service worker without allowing the browser HTTP cache to hide newer versions.
if ('serviceWorker' in navigator) {
  let reloadedForWorker = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForWorker) return;
    reloadedForWorker = true;
    // All account changes are written synchronously to localStorage before this reload.
    window.location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      const check = () => reg.update().catch(() => {});
      check();
      setInterval(check, 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    } catch (err) { console.warn('تعذّر فحص تحديث التطبيق', err); }
  });
}
