/*
 * Client-side helper template. Integrate into portal.html after the
 * corresponding Worker routes are implemented.
 */
async function enableAccountPushNotifications(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('هذا المتصفح لا يدعم إشعارات Push.');
  }
  if (!token) throw new Error('رابط العميل غير صالح.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('لم تسمح بالإشعارات.');

  const registration = await navigator.serviceWorker.ready;
  const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
  if (!keyResponse.ok) throw new Error('خدمة الإشعارات غير مهيأة على السيرفر.');
  const keyData = await keyResponse.json();
  if (!keyData.ok || !keyData.publicKey) throw new Error('مفتاح الإشعارات غير متوفر.');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
  });

  const response = await fetch('/api/portal/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, subscription: subscription.toJSON() })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || 'تعذر حفظ الاشتراك.');
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const raw = atob((base64String + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
