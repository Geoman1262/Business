# دفتر الحساب — حزمة تصحيح إعداد Cloudflare

## ما تم تصحيحه
- وضع Database ID الذي زوّدني به المستخدم لقاعدة `business-clients` داخل `wrangler.toml`.
- جعل مجلد الأصول هو جذر المستودع حتى لا يفشل النشر إذا لم يُرفع مجلد `public/`، وإضافة `.assetsignore` لاستبعاد `.git` و`.wrangler` وملفات الإدارة من الأصول العامة.
- إبقاء `worker.js` وملفات ترحيل D1 في الجذر.

## قبل أن تعمل بوابة العملاء
تصحيح `database_id` يعالج سبب خطأ النشر الظاهر في السجل، لكنه لا يهيئ الجداول أو سر الإدارة تلقائياً. بعد نشر ناجح، أكمل مرة واحدة:

1. في Cloudflare افتح D1 ثم قاعدة `business-clients`، وافتح SQL Console ونفّذ محتوى `migrations/0001_client_accounts.sql`.
2. من إعدادات Worker `business` أضف Secret باسم `ADMIN_KEY` مع قيمة قوية تختارها أنت. لا تضع القيمة في GitHub ولا ترسلها هنا.
3. في تطبيق الإدارة افتح «إعداد مفتاح المزامنة» وأدخل القيمة نفسها على جهاز الإدارة.
4. لكل عميل موجود محلياً، افتح ملفه واضغط حفظ/إنشاء رابط مرة واحدة لمزامنة بياناته إلى D1.

## تنبيه مهم
- لم يتم اختبار النشر داخل حساب Cloudflare الخاص بالمستخدم، ولا يمكن ضمان أن كل الوظائف تعمل قبل إكمال الخطوات أعلاه.
- احتفظ بنسخة احتياطية من بيانات التطبيق قبل أي تعديل أو نشر.
- ملفات الواجهة موجودة في جذر الحزمة. ارفع الملفات مع الحفاظ على ملفات المشروع الحالية التي لا تنتمي لهذه الحزمة وعدم حذف بيانات المستخدم. تأكد أن `.assetsignore` و`index.html` و`portal.html` في جذر المستودع.


## تشخيص ADMIN_KEY
بعد النشر افتح `/api/health` على عنوان الإنتاج. يجب أن تكون `databaseConfigured` و`adminKeyConfigured` بقيمة `true`. هذا المسار لا يكشف قيمة المفتاح. تم تعديل Worker لتجاهل المسافات الزائدة عند مقارنة المفتاح، ولإظهار الفرق بين Secret غير المضبوط ومفتاح غير مطابق. إذا كان `adminKeyConfigured` false، تحقق من Secret في بيئة Production للـ Worker `business` وأعد النشر. لا ترسل قيمة المفتاح لأحد.


## Fix: customer link must open reports, not the admin app
- The Worker now explicitly routes `/portal.html` and `/portal` to the customer portal asset.
- Generated customer links always use the Production host `https://business.lixgame.workers.dev/portal.html?token=...`, even if an admin accidentally opens a preview deployment.
- After deployment, create/update the customer link again and send the newly generated link. Old links from preview deployments should not be reused.
- Test by opening the full `/portal.html?token=...` URL in a private browser window. The customer should see the read-only statement page, not the admin navigation.
