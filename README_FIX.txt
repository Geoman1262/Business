دفتر الحساب — إصلاح رابط موافقة الطلب

ما تغير:
- استرجاع تدفق الطلب في portal.html ليطلب إنشاء طلب محفوظ عبر POST /api/order.
- رسالة WhatsApp الناتجة من Worker تحتوي رابط /order-review.html?token=... وليس رابط بوابة العميل.
- order-review.html يعرض تفاصيل الطلب ويسمح بالموافقة أو الرفض.
- worker.js يحتوي مسارات /api/order و/api/order-review.

قبل الاستخدام:
1) خذ نسخة احتياطية من ملفات المشروع الحالي.
2) تأكد أن migrations/0001_client_accounts.sql وmigrations/0002_client_orders.sql مطبّقة على D1 business-clients. لا تعِد تطبيق أي migration بشكل أعمى إذا كنت غير متأكد من حالتها.
3) ارفع الملفات مع الحفاظ على إعدادات Worker وSecret ADMIN_KEY الحالية، ثم انشر من GitHub/Cloudflare بالطريقة المعتادة.
4) اختبر بطلب صغير. لم يتم النشر أو اختبار D1 الحقيقي من هذه الحزمة.

ملاحظة مهمة: رابط المراجعة الإداري لا يحتاج أن يفتح حساب العميل؛ يجب أن يفتح /order-review.html?token=... على نطاق business.lixgame.workers.dev.
