const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key' };
const json = (obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8',...corsHeaders,'Cache-Control':'no-store'}});
const hex = bytes => [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
async function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return hex(b)}
export default {
 async fetch(request,env){
  const url=new URL(request.url); if(request.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  if(url.pathname.startsWith('/api/')){
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
  }
  // Force customer-only route through the Worker before static asset fallback.
  if (url.pathname === '/portal' || url.pathname === '/portal.html') {
   return env.ASSETS.fetch(new Request(new URL('/portal.html', url).toString(), request));
  }
  return env.ASSETS.fetch(request);
 }
};
