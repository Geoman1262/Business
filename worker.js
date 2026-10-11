const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key' };
const json = (obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8',...corsHeaders,'Cache-Control':'no-store'}});
const hex = bytes => [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
async function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return hex(b)}
function accountBalance(account){const entries=Array.isArray(account?.entries)?account.entries:[];const debts=entries.filter(e=>e.type==='debt').reduce((n,e)=>n+Math.max(0,Number(e.amount)||0),0);const payments=entries.filter(e=>e.type==='payment').reduce((n,e)=>n+Math.max(0,Number(e.amount)||0),0);return Math.max(0,Math.round((debts-payments)*100)/100)}
export default {
 async fetch(request,env){
  const url=new URL(request.url); if(request.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  if(url.pathname.startsWith('/api/')){
   try {
   if(url.pathname==='/api/health'&&request.method==='GET'){
    return json({ok:true,databaseConfigured:!!env.DB,adminKeyConfigured:typeof env.ADMIN_KEY==='string'&&env.ADMIN_KEY.trim().length>0,environment:'worker'});
   }
   // Validate a key before the browser stores it. This endpoint does not reveal the secret.
   if(url.pathname==='/api/verify-key'&&request.method==='POST'){
    const configuredKey=typeof env.ADMIN_KEY==='string'?env.ADMIN_KEY.trim():'';
    const suppliedKey=(request.headers.get('X-Admin-Key')||'').trim();
    if(!configuredKey)return json({ok:false,error:'ADMIN_KEY غير مضبوط في إعدادات Production لهذا Worker.'},503);
    if(!suppliedKey||suppliedKey!==configuredKey)return json({ok:false,error:'المفتاح الذي أدخلته لا يطابق Secret باسم ADMIN_KEY في Worker business ضمن Production. انسخ القيمة نفسها تماماً.'},401);
    return json({ok:true,keyMatches:true});
   }
   if(!env.DB) return json({error:'قاعدة البيانات D1 غير مربوطة. راجع تعليمات الإعداد.'},503);
   if(url.pathname==='/api/order'&&request.method==='POST'){
    let b;try{b=await request.json()}catch{return json({error:'بيانات غير صالحة'},400)};
    const t=String(b.token||'');if(!/^[a-f0-9]{64}$/.test(t))return json({error:'رابط العميل غير صالح'},400);
    const amount=Number(b.amount),details=String(b.details||'').trim();
    if(!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100)return json({error:'أدخل مبلغاً صحيحاً أكبر من صفر'},400);
    if(!details)return json({error:'التفاصيل إجبارية'},400);
    const row=await env.DB.prepare('SELECT client_id,client_name,client_phone,payload FROM client_accounts WHERE token=? AND active=1').bind(t).first();
    if(!row)return json({error:'رابط العميل غير موجود أو غير فعال'},404);
    let account;try{account=JSON.parse(row.payload)}catch{return json({error:'تعذرت قراءة الحساب'},500)};
    const limit=Math.max(0,Number(account.creditLimit)||0),balance=accountBalance(account),available=Math.max(0,Math.round((limit-balance)*100)/100);
    if(limit<=0)return json({error:'لا يمكن تقديم طلب قبل أن يحدد صاحب الحساب الحد الائتماني'},400);
    if(balance>=limit)return json({error:'تم بلوغ الحد الائتماني. لا يمكن تقديم طلب جديد.'},400);
    if(amount>available)return json({error:`المبلغ يتجاوز المتاح ائتمانياً. المتاح حالياً $${available.toFixed(2)}`},400);
    const orderToken=await token(),now=new Date().toISOString(),orderId=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO client_orders(order_id,review_token,client_id,client_name,client_phone,amount,details,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',?,?)").bind(orderId,orderToken,row.client_id,row.client_name,row.client_phone,amount,details,now,now).run();
    const reviewUrl=new URL('/order-review.html',url.origin);reviewUrl.searchParams.set('token',orderToken);
    const msg=`طلب جديد من ${row.client_name}\nالمبلغ: $${amount.toFixed(2)}\nالتفاصيل: ${details}\nمراجعة الطلب وتعديله والموافقة عليه: ${reviewUrl.toString()}`;
    return json({ok:true,whatsappUrl:'https://wa.me/96181024686?text='+encodeURIComponent(msg),reviewUrl:reviewUrl.toString(),availableAfter:Math.round((available-amount)*100)/100});
   }
   if(url.pathname==='/api/order-review'&&request.method==='GET'){
    const t=String(url.searchParams.get('token')||'');if(!/^[a-f0-9]{64}$/.test(t))return json({error:'رابط المراجعة غير صالح'},400);
    const row=await env.DB.prepare('SELECT order_id,client_name,client_phone,amount,details,status,created_at,updated_at FROM client_orders WHERE review_token=?').bind(t).first();
    if(!row)return json({error:'الطلب غير موجود'},404);
    const client=await env.DB.prepare('SELECT payload FROM client_accounts WHERE client_id=? AND active=1').bind((await env.DB.prepare('SELECT client_id FROM client_orders WHERE review_token=?').bind(t).first()).client_id).first();
    let available=0,balance=0,limit=0;if(client){try{const a=JSON.parse(client.payload);limit=Math.max(0,Number(a.creditLimit)||0);balance=accountBalance(a);available=Math.max(0,Math.round((limit-balance)*100)/100)}catch{}}
    return json({...row,available,balance,limit});
   }
   if(url.pathname==='/api/order-review'&&request.method==='POST'){
    let b;try{b=await request.json()}catch{return json({error:'بيانات غير صالحة'},400)};
    const t=String(b.token||'');if(!/^[a-f0-9]{64}$/.test(t))return json({error:'رابط المراجعة غير صالح'},400);
    const action=String(b.action||'');if(!['approve','reject'].includes(action))return json({error:'إجراء غير صالح'},400);
    const row=await env.DB.prepare('SELECT * FROM client_orders WHERE review_token=?').bind(t).first();if(!row)return json({error:'الطلب غير موجود'},404);if(row.status!=='pending')return json({error:'تمت معالجة هذا الطلب مسبقاً',status:row.status},409);
    const now=new Date().toISOString();
    if(action==='reject'){const upd=await env.DB.prepare("UPDATE client_orders SET status='rejected',updated_at=? WHERE order_id=? AND status='pending'").bind(now,row.order_id).run();if(!upd.meta?.changes)return json({error:'تمت معالجة الطلب مسبقاً'},409);return json({ok:true,status:'rejected'})}
    const amount=Number(b.amount),details=String(b.details||'').trim();if(!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100)return json({error:'أدخل مبلغاً صحيحاً أكبر من صفر'},400);if(!details)return json({error:'التفاصيل إجبارية'},400);
    const client=await env.DB.prepare('SELECT payload FROM client_accounts WHERE client_id=? AND active=1').bind(row.client_id).first();if(!client)return json({error:'حساب العميل غير موجود أو غير فعال'},404);
    let account;try{account=JSON.parse(client.payload)}catch{return json({error:'تعذرت قراءة حساب العميل'},500)};
    const limit=Math.max(0,Number(account.creditLimit)||0),balance=accountBalance(account),available=Math.max(0,Math.round((limit-balance)*100)/100);
    if(limit<=0||balance>=limit||amount>available)return json({error:`الحد الائتماني تغيّر أو المبلغ يتجاوز المتاح حالياً ($${available.toFixed(2)}). عدّل الطلب قبل الموافقة.`},409);
    if(!Array.isArray(account.entries))account.entries=[];
    const entryId='debt_'+crypto.randomUUID();account.entries.push({id:entryId,type:'debt',amount,note:details,ts:Date.now(),source:'customer_order',orderId:row.order_id});
    const upd=await env.DB.prepare("UPDATE client_orders SET status='approved',approved_amount=?,approved_details=?,updated_at=? WHERE order_id=? AND status='pending'").bind(amount,details,now,row.order_id).run();if(!upd.meta?.changes)return json({error:'تمت معالجة الطلب مسبقاً'},409);
    await env.DB.prepare('UPDATE client_accounts SET payload=?,updated_at=? WHERE client_id=? AND active=1').bind(JSON.stringify(account),now,row.client_id).run();
    return json({ok:true,status:'approved',amount,details});
   }
   if(url.pathname==='/api/portal'&&request.method==='GET'){
    const t=url.searchParams.get('token')||''; if(!/^[a-f0-9]{64}$/.test(t))return json({error:'الرابط غير صالح'},400);
    const row=await env.DB.prepare('SELECT client_name, client_phone, payload, updated_at FROM client_accounts WHERE token=? AND active=1').bind(t).first();
    if(!row)return json({error:'الرابط غير موجود أو تم إلغاؤه'},404);
    let payload;try{payload=JSON.parse(row.payload)}catch{return json({error:'تعذّر قراءة الحساب'},500)};
    return json({name:row.client_name,phone:row.client_phone,updatedAt:row.updated_at,account:payload});
   }
   const configuredKey=typeof env.ADMIN_KEY==='string'?env.ADMIN_KEY.trim():'';
   const suppliedKey=(request.headers.get('X-Admin-Key')||'').trim();
   if(!configuredKey)return json({error:'ADMIN_KEY غير مضبوط على Worker لهذه البيئة. أضفه ضمن Production Secrets ثم أعد النشر.'},503);
   if(!suppliedKey||suppliedKey!==configuredKey)return json({error:'المفتاح المرسل لا يطابق ADMIN_KEY المحفوظ في هذا Worker. احفظ المفتاح الصحيح في إعدادات التطبيق.'},401);
   if(url.pathname==='/api/client'&&request.method==='POST'){
    let b;try{b=await request.json()}catch{return json({error:'بيانات غير صالحة'},400)};
    if(!b||typeof b.id!=='string'||typeof b.name!=='string'||!b.data||!Array.isArray(b.data.entries))return json({error:'حقول العميل ناقصة'},400);
    const now=new Date().toISOString();
    const existing=await env.DB.prepare('SELECT token FROM client_accounts WHERE client_id=?').bind(b.id).first();
    const t=existing?.token||await token();
    await env.DB.prepare(`INSERT INTO client_accounts(client_id,token,client_name,client_phone,payload,updated_at,active) VALUES(?,?,?,?,?,?,1) ON CONFLICT(client_id) DO UPDATE SET client_name=excluded.client_name,client_phone=excluded.client_phone,payload=excluded.payload,updated_at=excluded.updated_at,active=1`).bind(b.id,t,b.name,String(b.phone||''),JSON.stringify(b.data),now).run();
    return json({ok:true,token:t,updatedAt:now,portalUrl:'https://business.lixgame.workers.dev/portal.html?token='+t});
   }
   if(url.pathname==='/api/revoke'&&request.method==='POST'){
    let b;try{b=await request.json()}catch{return json({error:'بيانات غير صالحة'},400)};
    if(typeof b.id!=='string')return json({error:'معرّف غير صالح'},400);
    await env.DB.prepare('UPDATE client_accounts SET active=0 WHERE client_id=?').bind(b.id).run();return json({ok:true});
   }
   return json({error:'المسار غير موجود'},404);
   } catch (err) {
    // Keep API failures as JSON so the portal can show the actual D1/Worker error instead of HTML.
    return json({error:'تعذر تنفيذ طلب API', detail:String(err && err.message ? err.message : err)},500);
   }
  }
   // Cloudflare Assets serves /portal.html directly; only /api/* runs through this Worker.
   return env.ASSETS.fetch(request);
 }
};
