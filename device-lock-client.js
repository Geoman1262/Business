/* Additive client helper. Include in portal page without replacing existing scripts. */
(() => {
  const KEY = 'business_device_key_v1';
  function getDeviceKey() {
    let key = localStorage.getItem(KEY);
    if (!key) {
      key = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      })).toLowerCase();
      localStorage.setItem(KEY, key);
    }
    return key;
  }
  // Existing portal should call window.registerCurrentDevice() after customer session is established.
  window.registerCurrentDevice = async function () {
    const res = await fetch('/api/portal/device-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceKey: getDeviceKey() }), cache: 'no-store'
    });
    if (res.status === 403) {
      document.body.innerHTML = '<main dir="rtl" style="font-family:system-ui;max-width:560px;margin:12vh auto;padding:24px;text-align:center"><h2>الجهاز مقفول</h2><p>لا يمكن استخدام التطبيق من هذا الجهاز حالياً. يرجى التواصل مع الإدارة.</p></main>';
      throw new Error('DEVICE_LOCKED');
    }
    if (!res.ok) throw new Error('DEVICE_CHECK_FAILED');
    return res.json();
  };
})();
