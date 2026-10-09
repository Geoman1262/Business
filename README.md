# دفتر الحساب — Debt Book

تطبيق ويب عربي لتسجيل البضاعة/الديون والدفعات مع سجل وفلترة بالتاريخ. يحفظ البيانات محليًا في المتصفح باستخدام `localStorage`؛ لا يوجد حساب مستخدم أو مزامنة بين الأجهزة.

## إصلاح نشر Cloudflare

هذا الأرشيف معدّ للمشروع الذي يستخدم أمر النشر `npx wrangler deploy`.

1. فك ضغط الملف.
2. ارفع محتويات المجلد إلى جذر مستودع GitHub `debt-book` مع الحفاظ على البنية التالية:
   - `wrangler.toml`
   - `public/index.html`
   - `public/manifest.webmanifest`
   - `public/sw.js`
   - `public/icon.svg`
3. اعمل Commit للتغييرات.
4. في Cloudflare Build settings، اجعل Deploy command: `npx wrangler deploy`، وBuild command فارغًا. لا تضف Build output directory؛ إعداد `wrangler.toml` يحدد مجلد الملفات الثابتة.
5. أعد النشر. يجب أن يقرأ Wrangler ملفات الموقع من `public/` بدلًا من البحث عن مجلد ملفات غير محدد.

## ملاحظة حول Pages مقابل Workers

الإعداد الموجود في `wrangler.toml` مخصص للنشر باستخدام `wrangler deploy` كـ Worker مع Static Assets. إذا أنشأت مشروعًا من نوع **Cloudflare Pages** عبر Connect to Git، فلا تستخدم أمر `npx wrangler deploy`؛ استخدم إعدادات Pages، واجعل Build command فارغًا وBuild output directory `public`.

## التثبيت على الهاتف والعمل دون إنترنت

بعد نجاح النشر وفتح رابط HTTPS في Chrome على Android، افتح القائمة ⋮ واختر Install app أو Add to Home screen. التخزين محلي على المتصفح/الجهاز، لذلك استخدم التصدير/النسخة الاحتياطية بانتظام.
