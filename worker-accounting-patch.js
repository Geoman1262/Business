/*
PATCH-ONLY FILE — DO NOT REPLACE worker.js WITH THIS FILE.
Integrate only after review and testing in a separate staging Worker.

A. Add helper near ensureOrders():
*/
async function ensureAccounting(DB) {
  await DB.prepare(`CREATE TABLE IF NOT EXISTS order_accounting (
    order_id TEXT PRIMARY KEY,
    serial TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    capital REAL,
    profit REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_order_accounting_client ON order_accounting(client_id)").run();
}

/*
B. In /api/order-review POST, after the order is successfully marked approved
and before notifyClient(...), add:
*/
await ensureAccounting(env.DB);
await env.DB.prepare(`INSERT OR IGNORE INTO order_accounting
(order_id,serial,client_id,client_name,total_amount,details,capital,profit,created_at,updated_at)
VALUES(?,?,?,?,?,?,NULL,NULL,?,?)`)
.bind(r.order_id, "TX-"+String(r.order_id).replace(/-/g,"").slice(0,12).toUpperCase(),
      r.client_id, r.client_name, Number(r.amount), r.details, now, now).run();

/*
C. Under the existing admin-authenticated section, immediately after:
if(!auth(request,env))return fail("...",401);
insert these routes.
*/
if(url.pathname==="/api/admin/accounting" && request.method==="GET"){
  await ensureAccounting(env.DB);
  // Idempotent backfill for already-approved orders.
  const approved=await env.DB.prepare(`SELECT order_id,client_id,client_name,
    COALESCE(approved_amount,amount) AS amount,COALESCE(approved_details,details) AS details,
    created_at,updated_at FROM client_orders WHERE status='approved' ORDER BY created_at DESC`).all();
  for(const r of (approved.results||[])){
    await env.DB.prepare(`INSERT OR IGNORE INTO order_accounting
      (order_id,serial,client_id,client_name,total_amount,details,capital,profit,created_at,updated_at)
      VALUES(?,?,?,?,?,?,NULL,NULL,?,?)`)
      .bind(r.order_id,"TX-"+String(r.order_id).replace(/-/g,"").slice(0,12).toUpperCase(),
        r.client_id,r.client_name,Number(r.amount),r.details||"",
        r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString()).run();
  }
  const rows=await env.DB.prepare(`SELECT a.order_id,a.serial,a.client_id,a.client_name,a.total_amount,
    a.details,a.capital,a.profit,a.created_at,a.updated_at,c.payload
    FROM order_accounting a LEFT JOIN client_accounts c ON c.client_id=a.client_id
    ORDER BY a.created_at DESC`).all();
  const operations=(rows.results||[]).map(r=>{
    let data={entries:[]};try{data=JSON.parse(r.payload||"{}")}catch{}
    const entries=Array.isArray(data.entries)?data.entries:[];
    const debt=entries.filter(e=>e.type==="debt").reduce((n,e)=>n+Math.max(0,Number(e.amount)||0),0);
    const paid=entries.filter(e=>e.type==="payment").reduce((n,e)=>n+Math.max(0,Number(e.amount)||0),0);
    return {order_id:r.order_id,serial:r.serial,client_id:r.client_id,client_name:r.client_name,
      total_amount:Number(r.total_amount)||0,details:r.details||"",capital:r.capital,profit:r.profit,
      customer_total_paid:Math.round(paid*100)/100,
      customer_balance:Math.round(Math.max(0,debt-paid)*100)/100,
      accounting_status:r.capital!==null&&r.profit!==null?"complete":"pending",
      created_at:r.created_at,updated_at:r.updated_at};
  });
  return json({ok:true,operations});
}
if(url.pathname==="/api/admin/accounting/save" && request.method==="POST"){
  let b;try{b=await request.json()}catch{return fail("بيانات المحاسبة غير صالحة.")};
  const orderId=String(b.orderId||"").trim(),capital=Number(b.capital),profit=Number(b.profit);
  if(!orderId)return fail("العملية غير محددة.");
  if(!Number.isFinite(capital)||capital<0||!Number.isFinite(profit)||profit<0||
     Math.round(capital*100)!==capital*100||Math.round(profit*100)!==profit*100)
    return fail("أدخل رأس المال والربح بأرقام صحيحة حتى منزلتين عشريتين.");
  await ensureAccounting(env.DB);
  const row=await env.DB.prepare("SELECT total_amount,capital,profit FROM order_accounting WHERE order_id=?").bind(orderId).first();
  if(!row)return fail("العملية غير موجودة في المحاسبة.",404);
  if(row.capital!==null||row.profit!==null)return fail("تم حفظ البيانات المحاسبية لهذه العملية سابقاً؛ لا يمكن استبدالها من هذه الشاشة.",409);
  if(Math.round((capital+profit)*100)!==Math.round(Number(row.total_amount)*100))
    return fail("رأس المال + الربح يجب أن يساوي قيمة العملية.");
  const now=new Date().toISOString();
  const u=await env.DB.prepare(`UPDATE order_accounting SET capital=?,profit=?,updated_at=?
    WHERE order_id=? AND capital IS NULL AND profit IS NULL`).bind(capital,profit,now,orderId).run();
  if(!u.meta?.changes)return fail("تغيّرت العملية أثناء الحفظ؛ حدّث القائمة.",409);
  return json({ok:true,capital,profit});
}

/*
KNOWN LIMITATION:
The current app records payments on the customer ledger, not against a specific order.
This patch shows customer-wide outstanding balance and customer-wide payments, not a per-order
payment allocation. Do not label those figures as per-order remaining until a payment-allocation
rule is decided. No existing customer/admin UI files are modified by this patch.
*/
