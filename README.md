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


## التحقق من مفتاح المزامنة (نسخة مصححة)
زر إعداد مفتاح المزامنة يتحقق الآن عبر `/api/verify-key` من تطابق القيمة مع Secret `ADMIN_KEY` في Worker `business` ضمن Production قبل حفظها محلياً. لا يطلب هذا المسار ولا يكشف قيمة السر. يجب نشر `worker.js` و`index.html` معاً.


## Fix final: `/portal.html` must bypass asset fallback
- Added `/portal.html` and `/portal` to `assets.run_worker_first`; otherwise Cloudflare Assets may answer the request with the admin app/fallback before the Worker can route the customer portal.
- Worker explicitly serves `portal.html` for those paths.
- Customer URLs are always generated with the production hostname `business.lixgame.workers.dev`, not a Preview hostname.

After deploying, generate/update the client's link again and open the newly generated `/portal.html?token=...` URL. Existing links can be reused only if the token still exists and is active, but regenerate to ensure production hostname.


## إصلاح بوابة العميل وعدم الرجوع إلى صفحة الإدارة
- تم تحديث `sw.js` إلى cache version جديد.
- مسار `/portal.html` يُطلب من الشبكة مباشرةً، ولا يُستخدم `index.html` كبديل عند فشل الاتصال.
- هذا الإصلاح يمنع Service Worker من تخزين صفحة بوابة العميل على أنها الصفحة الرئيسية.
- بعد رفع الملفات ونشر Worker، افتح الرابط الجديد بإنترنت فعّال. إذا كان المتصفح يحتفظ بنسخة قديمة، أغلق تبويبات الموقع وافتحه مجدداً أو امسح بيانات الموقع/أعد تثبيت PWA.
- لم يتم نشر هذه الحزمة داخل حساب Cloudflare الخاص بك من هنا؛ لذلك يجب التحقق بعد النشر من أن `/portal.html` يعرض عنوان «كشف حساب العميل» وأن `/api/portal?token=...` يعيد بيانات العميل الصحيحة.
