# Cesar Social Publisher

نظام نشر مستقل عن `Cesar Response`. يقرأ المنتجات النشطة فقط، ويعيد فحص السعر
والمخزون والصورة قبل كل نشر، ويستخدم طابورًا ذريًا لمنع النشر المكرر.

## الوضع الآمن الحالي

- الإعداد الافتراضي: `enabled = false` و`mode = draft`.
- لا تُخزن أي رموز Meta داخل قاعدة البيانات.
- جداول النظام محمية بـRLS ومرفوضة تمامًا لأدوار `anon` و`authenticated`.
- الوصول يتم من الخادم فقط بعد التحقق من صلاحية مدير النظام.
- تطبيق `Cesar Response` ومتغيراته الحالية لا يتم تعديلهما أو إعادة استخدامهما.

## تطبيق Meta مستقل

أنشئ تطبيقًا جديدًا باسم `Cesar Social Publisher` داخل نفس Meta Business الذي
يمتلك صفحة Facebook الجديدة وحساب Instagram الاحترافي المرتبط بها.

المطلوب للتطبيق:

1. ربط صفحة Facebook الجديدة وحساب Instagram الاحترافي.
2. منح صلاحيات النشر اللازمة:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
3. إنشاء Page Access Token خاص بهذا التطبيق/النظام بصلاحيات النشر فقط.
4. عدم مشاركة أي مفتاح أو رمز داخل المحادثة أو مستودع Git.

## متغيرات Vercel السرية

أضف القيم التالية في Vercel Project Settings > Environment Variables للإنتاج
والـPreview المناسب، ولا تضع بادئة `NEXT_PUBLIC_` على أي منها:

```text
META_PUBLISHER_APP_ID=
META_PUBLISHER_APP_SECRET=
META_PUBLISHER_PAGE_ID=
META_PUBLISHER_IG_USER_ID=
META_PUBLISHER_PAGE_ACCESS_TOKEN=
META_PUBLISHER_GRAPH_API_VERSION=v26.0
CRON_SECRET=
```

ينبغي أن يكون `CRON_SECRET` قيمة عشوائية طويلة. Vercel يرسلها تلقائيًا في رأس
`Authorization: Bearer ...` إلى مسار Cron.

## التشغيل

1. انشر الكود بعد إضافة المتغيرات.
2. افتح `/admin/social-publisher` بحساب المدير الكامل.
3. تأكد أن لوحة الاتصال لا تعرض متغيرات ناقصة.
4. اترك الوضع `draft` وأنشئ أول منشور كمسودة.
5. راجع المنتج والنص والموعد والمنصات ثم اضغط اعتماد.
6. بعد نجاح الاختبار المقيد، غيّر الوضع إلى `live` وشغّل النظام.

## الإيقاف والرجوع

- زر **تشغيل النظام** هو مفتاح الإيقاف الفوري؛ إلغاؤه يمنع أي نشر جديد.
- نقطة الرجوع قبل التنفيذ: `codex-social-publisher-pre-20261030`.
- إلغاء النشر لا يحذف السجل؛ تظل كل المحاولات محفوظة للتدقيق.
