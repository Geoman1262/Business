#!/usr/bin/env python3
"""Add an in-app notification inbox to the current Business repo without overwriting originals."""
from pathlib import Path
import sys
root=Path.cwd(); wp=root/'worker.js'; pp=root/'portal.html'
if not wp.exists() or not pp.exists(): sys.exit('Run from Business repo root: worker.js and portal.html must exist.')
w=wp.read_text(encoding='utf-8'); p=pp.read_text(encoding='utf-8')
if 'client_in_app_notifications' in w or 'inAppNotifications' in p: sys.exit('Looks already integrated; stopped without writing files.')
def once(s,old,new,label):
    n=s.count(old)
    if n!=1: sys.exit(f'Expected one insertion point for {label}, found {n}. No output written.')
    return s.replace(old,new,1)
old="async function notifyClient(env,clientId,payload){try{if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return;await ensurePush(env.DB);const rows=await env.DB.prepare('SELECT subscription_id,endpoint,p256dh,auth FROM client_push_subscriptions WHERE client_id=?').bind(clientId).all();for(const row of rows.results||[]){try{const result=await sendOnePush(row,payload,env);if(result.expired)await env.DB.prepare('DELETE FROM client_push_subscriptions WHERE subscription_id=?').bind(row.subscription_id).run()}catch(e){console.error('Push delivery failed',String(e?.message||e))}}}catch(e){console.error('Push notify failed',String(e?.message||e))}}"
new="""async function ensureInAppNotifications(DB){await DB.prepare(`CREATE TABLE IF NOT EXISTS client_in_app_notifications(notification_id TEXT PRIMARY KEY,client_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,url TEXT NOT NULL DEFAULT '',tag TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,read_at TEXT)`).run();await DB.prepare('CREATE INDEX IF NOT EXISTS idx_in_app_notifications_client_date ON client_in_app_notifications(client_id,created_at)').run()}
async function notifyClient(env,clientId,payload){
 try{await ensureInAppNotifications(env.DB);await env.DB.prepare('INSERT INTO client_in_app_notifications(notification_id,client_id,title,body,url,tag,created_at,read_at) VALUES(?,?,?,?,?,?,?,NULL)').bind(crypto.randomUUID(),clientId,String(payload?.title||'تحديث جديد'),String(payload?.body||''),String(payload?.url||''),String(payload?.tag||''),new Date().toISOString()).run()}catch(e){console.error('In-app notification save failed',String(e?.message||e))}
 try{if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return;await ensurePush(env.DB);const rows=await env.DB.prepare('SELECT subscription_id,endpoint,p256dh,auth FROM client_push_subscriptions WHERE client_id=?').bind(clientId).all();for(const row of rows.results||[]){try{const result=await sendOnePush(row,payload,env);if(result.expired)await env.DB.prepare('DELETE FROM client_push_subscriptions WHERE subscription_id=?').bind(row.subscription_id).run()}catch(e){console.error('Push delivery failed',String(e?.message||e))}}}catch(e){console.error('Push notify failed',String(e?.message||e))}}"""
w=once(w,old,new,'notifyClient')
anchor='  if(url.pathname==="/api/portal"&&request.method==="GET") {'
routes='''  // ADDITION ONLY: customer in-app notification inbox endpoints.
  if(url.pathname==="/api/portal/notifications"&&request.method==="GET"){
   const t=url.searchParams.get("token")||"";if(!/^[a-f0-9]{64}$/.test(t))return fail("رابط العميل غير صالح.",400);
   const c=await env.DB.prepare("SELECT client_id FROM client_accounts WHERE token=? AND active=1").bind(t).first();if(!c)return fail("رابط العميل غير موجود أو موقوف.",404);
   await ensureInAppNotifications(env.DB);
   const rows=await env.DB.prepare("SELECT notification_id,title,body,url,tag,created_at,read_at FROM client_in_app_notifications WHERE client_id=? ORDER BY created_at DESC LIMIT 100").bind(c.client_id).all();
   const unread=await env.DB.prepare("SELECT COUNT(*) AS count FROM client_in_app_notifications WHERE client_id=? AND read_at IS NULL").bind(c.client_id).first();
   return json({ok:true,notifications:rows.results||[],unreadCount:Number(unread?.count||0)});
  }
  if(url.pathname==="/api/portal/notifications/read"&&request.method==="POST"){
   let b;try{b=await request.json()}catch{return fail("بيانات غير صالحة.")};const t=String(b.token||"");if(!/^[a-f0-9]{64}$/.test(t))return fail("رابط العميل غير صالح.",400);
   const c=await env.DB.prepare("SELECT client_id FROM client_accounts WHERE token=? AND active=1").bind(t).first();if(!c)return fail("رابط العميل غير موجود أو موقوف.",404);await ensureInAppNotifications(env.DB);const now=new Date().toISOString();
   if(b.markAll===true)await env.DB.prepare("UPDATE client_in_app_notifications SET read_at=? WHERE client_id=? AND read_at IS NULL").bind(now,c.client_id).run();
   else{const id=String(b.notificationId||"");if(!id)return fail("الإشعار غير محدد.");await env.DB.prepare("UPDATE client_in_app_notifications SET read_at=? WHERE notification_id=? AND client_id=? AND read_at IS NULL").bind(now,id,c.client_id).run()}
   return json({ok:true});
  }
'''
w=once(w,anchor,routes+anchor,'notification API routes')
ui_anchor='<div id="content" class="hidden"><section class="glass"><h2>إشعارات الحساب</h2>'
ui='''<div id="content" class="hidden"><section class="glass" id="inAppInbox"><div class="row"><h2 style="margin:0">📨 مركز الإشعارات <span id="inAppUnread" class="pending"></span></h2><button id="markAllRead" type="button" style="width:auto;padding:8px 10px">قراءة الكل</button></div><p class="muted">تبقى هذه الرسائل محفوظة هنا حتى بعد حذف إشعار الهاتف.</p><div id="inAppList"><div class="empty">جارٍ تحميل الإشعارات...</div></div><button id="refreshInApp" type="button" style="margin-top:10px;background:#27496b">تحديث الإشعارات</button></section><section class="glass"><h2>إشعارات الحساب</h2>'''
p=once(p,ui_anchor,ui,'in-app inbox UI')
p=once(p,'</style><link rel="manifest"','''.inapp-note{padding:12px 10px;border-bottom:1px solid #ffffff1c;border-radius:10px;cursor:pointer}.inapp-note:last-child{border-bottom:0}.inapp-note.unread{background:#ffffff12;border-right:3px solid #39c9f0}.inapp-note-title{font-weight:750}.inapp-note-body{font-size:13px;line-height:1.7;color:#d5e4f2;margin-top:4px;white-space:pre-wrap}.inapp-note-date{font-size:11px;color:#a9bfd4;margin-top:5px}.inapp-badge{display:inline-block;border-radius:99px;background:#d83b52;color:white;font-size:12px;padding:2px 7px;margin-right:5px}</style><link rel="manifest"''','in-app inbox styles')
js_anchor='async function start(){'
js=r'''let inAppNotifications=[];
function renderInAppNotifications(){const list=$('inAppList'),badge=$('inAppUnread');const unread=inAppNotifications.filter(n=>!n.read_at).length;badge.innerHTML=unread?`<span class="inapp-badge">${unread}</span>`:'';if(!inAppNotifications.length){list.innerHTML='<div class="empty">لا توجد إشعارات حالياً.</div>';return}list.innerHTML=inAppNotifications.map(n=>`<div class="inapp-note ${n.read_at?'':'unread'}" data-notification-id="${esc(n.notification_id)}"><div class="inapp-note-title">${esc(n.title||'إشعار جديد')}</div><div class="inapp-note-body">${esc(n.body||'')}</div><div class="inapp-note-date">${esc(fmt(n.created_at))}${n.read_at?' · مقروء':' · جديد'}</div></div>`).join('');list.querySelectorAll('[data-notification-id]').forEach(el=>el.addEventListener('click',async()=>{const id=el.dataset.notificationId,n=inAppNotifications.find(x=>x.notification_id===id);if(n&&!n.read_at){try{const r=await fetch('/api/portal/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,notificationId:id})}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'تعذّر تحديث حالة الإشعار');n.read_at=new Date().toISOString();renderInAppNotifications()}catch(e){alert(e.message)}}}))}
async function loadNotifications(){const list=$('inAppList');if(!list)return;try{const r=await fetch('/api/portal/notifications?token='+encodeURIComponent(token),{cache:'no-store'}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'تعذّر تحميل الإشعارات');inAppNotifications=Array.isArray(j.notifications)?j.notifications:[];renderInAppNotifications()}catch(e){list.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
$('refreshInApp').addEventListener('click',loadNotifications);
$('markAllRead').addEventListener('click',async()=>{try{const r=await fetch('/api/portal/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,markAll:true})}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'تعذّر تحديث الإشعارات');const now=new Date().toISOString();inAppNotifications.forEach(n=>{if(!n.read_at)n.read_at=now});renderInAppNotifications()}catch(e){alert(e.message)}});
'''
p=once(p,js_anchor,js+js_anchor,'in-app inbox JavaScript')
p=once(p,'makeHistory();renderHistory();}catch(e)','makeHistory();renderHistory();loadNotifications();}catch(e)','load inbox on portal open')
out=root/'inapp-notifications-output';out.mkdir(exist_ok=True)
(out/'worker.js').write_text(w,encoding='utf-8');(out/'portal.html').write_text(p,encoding='utf-8')
(out/'README_AR.md').write_text('''# مركز الإشعارات داخل التطبيق — إضافة فقط\n\n## الملفات الناتجة\n- `worker.js`: نسخة محدثة من Worker الحالي.\n- `portal.html`: نسخة محدثة من بوابة العميل.\n- لا تعديل على `index.html` أو `sw.js` أو `wrangler.toml`.\n\n## طريقة التطبيق\n1. شغّل `apply_patch.py` من جذر مستودع Business (حيث يوجد `worker.js` و`portal.html`).\n2. سيُنشئ `inapp-notifications-output` ويضع فيه النسختين دون تغيير الأصل.\n3. راجع النسختين ثم ارفع `worker.js` و`portal.html` الناتجين إلى GitHub واعمل Commit.\n4. ينشئ Worker جدول D1 تلقائياً. لا يلزم SQL يدوي.\n5. بعد النشر، افتح بوابة العميل وولّد إشعاراً من حدث قائم لاختبار ظهوره في مركز الإشعارات.\n\n## ما الذي أضيف؟\n- صندوق إشعارات داخل بوابة العميل، وعدّاد غير المقروء.\n- تحديد إشعار كمقروء و«قراءة الكل».\n- تخزين الإشعارات في D1 مع بقاء إشعارات الهاتف كما هي.\n- حفظ نسخة داخلية أولاً، ثم متابعة محاولة إرسال Push؛ فشل حفظ الإشعار الداخلي لا يمنع محاولة Push.\n\n## ضمان عدم تغيير القديم\nالسكربت يوقف نفسه إذا لم يجد كل نقطة إدراج مرة واحدة أو إذا بدا أن الميزة مضافة مسبقاً. لا يكتب فوق الملفات الأصلية. التعديل يستهدف `worker.js` و`portal.html` فقط. لم يتم نشر الحزمة إلى Cloudflare.\n''',encoding='utf-8')
print('Created:',out/'worker.js',out/'portal.html')
