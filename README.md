# دفتر الحساب — إصلاح تشخيص D1

## ما تغيّر
- Worker ينشئ جدول `client_accounts` والفهرس تلقائياً عند فحص `/api/health` أو استخدام API، إذا كان ربط D1 صحيحاً. لا حاجة لتشغيل SQL يدوياً لأول تشغيل.
- `/api/health` يعرض `databaseConfigured`, `schemaConfigured`, `adminKeyConfigured`، ويعرض خطأ قاعدة البيانات إن فشل إعداد الجداول دون كشف قيمة السر.
- واجهة الإعدادات تفحص صحة D1 عند فتح التطبيق، ولا تعرض رسالة ثابتة مضللة.
- `wrangler.toml` يستخدم Database ID المرسل من المستخدم.

## نشر
1. خذ نسخة احتياطية من بيانات المتصفح من الإعدادات قبل أي تعديل.
2. ارفع محتويات الحزمة إلى جذر مستودع GitHub المرتبط بـ Worker `business`، مع الحفاظ على `wrangler.toml` و`worker.js` و`migrations` وملفات الواجهة.
3. تأكد أن Secret باسم `ADMIN_KEY` مضبوط تحت Production في Worker `business`، ولا تضع قيمته في GitHub.
4. بعد النشر افتح `https://business.lixgame.workers.dev/api/health`. المتوقع: `ok:true`, `databaseConfigured:true`, `schemaConfigured:true`, `adminKeyConfigured:true`.
5. في دفتر الحساب اضغط إعداد مفتاح المزامنة وأدخل نفس قيمة Secret، ثم اضغط إنشاء/تحديث رابط العميل.

## ملاحظة
تم فحص صياغة JavaScript محلياً. لم يتم تنفيذ نشر على حساب Cloudflare للمستخدم أو اختبار معاملات D1 الحية؛ تحقق من `/api/health` بعد النشر.
