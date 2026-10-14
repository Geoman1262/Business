/*
 * Add-on client helper for Web Push.
 * This file is a template: integrate it into portal.html only after
 * the matching authenticated-by-token subscription endpoint exists.
 */
async function enableAccountPushNotifications(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('هذا المتصفح لا يدعم إشعارات Push.');
  }
  if (!token) throw new Error('رابط العميل غير صالح.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('لم تسمح بالإشعارات.');
  }

  const registration = await navigator.serviceWorker.ready;
  const publicKeyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
  if (!publicKeyResponse.ok) throw new Error('خدمة الإشعارات غير مهيأة على السيرفر.');
  const publicData = await publicKeyResponse.json();
  if (!publicData.ok || !publicData.publicKey) throw new Error('مفتاح الإشعارات غير متوفر.');

  const applicationServerKey = urlBase64ToUint8Array(publicData.publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  const response = await fetch('/api/portal/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, subscription: subscription.toJSON() })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'تعذر حفظ اشتراك الإشعارات.');
  }
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
