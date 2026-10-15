/* Additive device registry for Cloudflare Workers + D1.
 * Call ensureDeviceTables(env.DB) during migration/admin setup, not on every request if avoidable.
 * All admin routes MUST be called only after the existing admin authentication check.
 */
const DEVICE_ID_RE = /^[a-f0-9-]{20,80}$/i;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
export async function ensureDeviceTables(DB) {
  await DB.prepare(`CREATE TABLE IF NOT EXISTS customer_devices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    device_key TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'جهاز غير معروف',
    user_agent TEXT,
    platform TEXT,
    ip_address TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    locked_at TEXT,
    UNIQUE(customer_id, device_key)
  )`).run();
  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_customer_devices_customer ON customer_devices(customer_id, last_seen_at DESC)`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS customer_device_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    device_id TEXT,
    device_key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT
  )`).run();
  await DB.prepare(`CREATE INDEX IF NOT EXISTS idx_device_events_customer_time ON customer_device_events(customer_id, event_at DESC)`).run();
}
function deviceLabel(ua = '') {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  const samsung = ua.match(/SM-[A-Z0-9-]+/i);
  if (samsung) return `Samsung (${samsung[0]})`;
  if (/Android/i.test(ua)) return 'هاتف Android';
  if (/Windows NT/i.test(ua)) return 'كمبيوتر Windows';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'جهاز غير معروف';
}
const now = () => new Date().toISOString();

// Called by the existing authenticated customer-portal route for each page visit.
// customerId must come from the server-validated customer session, NEVER from request JSON.
export async function recordCustomerDevice(request, env, customerId, deviceKey) {
  if (!customerId || !deviceKey || !DEVICE_ID_RE.test(deviceKey)) return json({ error: 'invalid_device' }, 400);
  const DB = env.DB;
  await ensureDeviceTables(DB);
  const at = now();
  const ua = request.headers.get('user-agent') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'غير معروف';
  let row = await DB.prepare('SELECT * FROM customer_devices WHERE customer_id=? AND device_key=?').bind(String(customerId), deviceKey).first();
  if (!row) {
    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO customer_devices(id,customer_id,device_key,label,user_agent,platform,ip_address,first_seen_at,last_seen_at,locked)
      VALUES(?,?,?,?,?,?,?,?,?,1)`).bind(id,String(customerId),deviceKey,deviceLabel(ua),ua,platform,ip,at,at,1).run();
    row = await DB.prepare('SELECT * FROM customer_devices WHERE id=?').bind(id).first();
    await DB.prepare(`INSERT INTO customer_device_events(customer_id,device_id,device_key,event_type,event_at,ip_address,user_agent,details)
      VALUES(?,?,?,?,?,?,?,?)`).bind(String(customerId),id,deviceKey,'new_device',at,ip,ua,'جهاز جديد؛ يحتاج فتح القفل من الإدارة').run();
  } else {
    await DB.prepare('UPDATE customer_devices SET last_seen_at=?,ip_address=?,user_agent=?,platform=? WHERE id=?').bind(at,ip,ua,platform,row.id).run();
    await DB.prepare(`INSERT INTO customer_device_events(customer_id,device_id,device_key,event_type,event_at,ip_address,user_agent,details)
      VALUES(?,?,?,?,?,?,?,?)`).bind(String(customerId),row.id,deviceKey,row.locked ? 'locked_attempt' : 'visit',at,ip,ua,row.locked ? 'محاولة دخول من جهاز مقفول' : 'زيارة').run();
    row = await DB.prepare('SELECT * FROM customer_devices WHERE id=?').bind(row.id).first();
  }
  if (row.locked) return json({ error: 'device_locked', message: 'هذا الجهاز مقفول. يرجى مراجعة الإدارة.' }, 403);
  return json({ ok: true, deviceId: row.id, platform, label: row.label });
}

// Admin endpoints: call ONLY after the existing admin auth check.
// GET /api/admin/customer-devices?customerId=...
// POST /api/admin/customer-devices/toggle { deviceId, locked }
// GET /api/admin/customer-device-events?customerId=...&limit=100
export async function handleDeviceAdmin(request, env, url) {
  const DB = env.DB;
  await ensureDeviceTables(DB);
  if (request.method === 'GET' && url.pathname.endsWith('/customer-devices')) {
    const customerId = url.searchParams.get('customerId');
    if (!customerId) return json({ error: 'customerId_required' }, 400);
    const { results = [] } = await DB.prepare('SELECT id,customer_id,label,platform,ip_address,first_seen_at,last_seen_at,locked,locked_at FROM customer_devices WHERE customer_id=? ORDER BY last_seen_at DESC').bind(customerId).all();
    return json({ devices: results });
  }
  if (request.method === 'GET' && url.pathname.endsWith('/customer-device-events')) {
    const customerId = url.searchParams.get('customerId');
    if (!customerId) return json({ error: 'customerId_required' }, 400);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)));
    const { results = [] } = await DB.prepare('SELECT id,customer_id,device_id,device_key,event_type,event_at,ip_address,user_agent,details FROM customer_device_events WHERE customer_id=? ORDER BY event_at DESC LIMIT ?').bind(customerId,limit).all();
    return json({ events: results });
  }
  if (request.method === 'POST' && url.pathname.endsWith('/customer-devices/toggle')) {
    let body; try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
    if (!body.deviceId || typeof body.locked !== 'boolean') return json({ error: 'deviceId_and_locked_required' }, 400);
    const row = await DB.prepare('SELECT * FROM customer_devices WHERE id=?').bind(String(body.deviceId)).first();
    if (!row) return json({ error: 'device_not_found' }, 404);
    const at = now();
    await DB.prepare('UPDATE customer_devices SET locked=?,locked_at=? WHERE id=?').bind(body.locked ? 1 : 0, body.locked ? at : null, String(body.deviceId)).run();
    await DB.prepare(`INSERT INTO customer_device_events(customer_id,device_id,device_key,event_type,event_at,ip_address,user_agent,details)
      VALUES(?,?,?,?,?,?,?,?)`).bind(row.customer_id,row.id,row.device_key,body.locked ? 'locked_by_admin' : 'unlocked_by_admin',at,'','',body.locked ? 'أقفلت الإدارة الجهاز' : 'فتحت الإدارة قفل الجهاز').run();
    return json({ ok: true, locked: body.locked });
  }
  return json({ error: 'not_found' }, 404);
}
