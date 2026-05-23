# وثيقة إنجاز وتقييم مشروع Cesar Store

تاريخ إعداد الوثيقة: 2026-05-23  
المسار المحلي المقروء: `D:\mohamed adel work\cesar-store`  
الفرع الحالي وقت القراءة: `emergency-recovery`  
نوع الفحص: قراءة كود محلي + قراءة آمنة لقاعدة البيانات بدون طباعة أسرار أو بيانات عملاء.

## 1. الغرض من الوثيقة

هذه الوثيقة مكتوبة لتكون نقطة بداية آمنة لشات جديد، بحيث يستطيع أي عمل لاحق فهم حالة المشروع الفعلية من الكود المحلي وقاعدة البيانات بدون الرجوع إلى ذاكرة المحادثة القديمة.

الوثيقة لا تنفذ أي تغيير وظيفي في الموقع، ولا تعتمد على تخمين فقط. تم الاعتماد على قراءة ملفات المشروع، ملفات Supabase migrations، وإحصاءات قراءة فقط من قاعدة البيانات.

## 2. قواعد العمل الواجب استمرارها

- ممنوع إعادة كتابة صفحات كاملة أو بلوكات كبيرة بدون ضرورة.
- أي تعديل لاحق يجب أن يكون جراحيا ومحدودا في الملف أو المنطق محل المشكلة.
- ممنوع كسر منطق السلة أو الطلبات أو تسجيل الدخول أو checkout.
- ممنوع إضافة مكتبات جديدة أو تغيير إصدارات مكتبات بدون موافقة صريحة.
- ممنوع تشغيل `npm run build` إلا بطلب صريح لأنه طويل وقد يعلق.
- الفحوصات الآمنة المفضلة: `npx tsc --noEmit --incremental false`، ثم `npm run lint`، ثم `git diff --check`.
- ممنوع طباعة أسرار `.env.local` أو مفاتيح Supabase/Sentry/Redis.
- ممنوع استخدام `git reset --hard` أو `git checkout --` لإلغاء تغييرات إلا بأمر صريح.
- عند وجود تغييرات Git غير مفهومة يجب التوقف وتحليلها قبل commit/push.

## 3. ملخص الحالة العامة

المشروع متجر إلكتروني فعلي مبني على:

- Next.js 14.2.5 App Router.
- React 18.2.0.
- Supabase Auth/Database/Storage/Realtime.
- Sentry للمراقبة.
- Upstash Redis للـ rate limiting.
- Vercel للنشر.
- WhatsApp كقناة إرسال الطلب النهائي.
- نسخة Android/Capacitor محلية منفصلة قيد التجربة في `D:\mohamed adel work\cesar-store app`.

تقييمي الحالي: المشروع جاهز للتشغيل الحذر والاختبار الحقيقي، لكن لا يجب اعتباره "مغلقا نهائيا" قبل تنظيف حالة Git الحالية، تثبيت مسار الموبايل، وإضافة حماية اختبارية أو يدوية صارمة للمسارات الحساسة.

## 4. حالة Git الحالية وقت كتابة الوثيقة

الفرع الحالي: `emergency-recovery`.

توجد تغييرات غير ملتزم بها:

- ملف معدل: `app/auth/login/page.tsx`.
- مجموعة كبيرة من صور المنتجات عليها حالة حذف داخل `public/products/accessories` و`public/products/air-fresheners`.
- ملف صورة معدل: `public/products/detergent/21.jpg`.
- ملف غير متتبع: `public/products/equipment/8a.jpeg`.

ملاحظة مهمة: هذه تغييرات قائمة قبل كتابة الوثيقة أو خارج نطاقها، ولم يتم إلغاؤها. لا يجب عمل commit أو push قبل مراجعة هذه الصور والتأكد هل حذفها مقصود أم نتيجة نقل/تنظيف محلي.

## 5. متغيرات البيئة الموجودة محليا

تمت قراءة أسماء المفاتيح فقط بدون قراءة أو طباعة القيم.

المفاتيح الموجودة:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `USE_RPC`
- `SUPER_ADMIN_EMAIL`
- `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`
- `RESET_SECRET`
- `SENTRY_DSN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ENABLE_ANALYTICS_RESET`

ملاحظة: ظهر `RESET_SECRET` مرتين عند قراءة أسماء المفاتيح. يجب مراجعة `.env.local` لاحقا بدون طباعة القيم للتأكد أن التكرار مقصود أو غير مؤثر.

## 6. بنية المشروع

عدد الملفات المقروءة/المفهرسة حسب المجلدات الأساسية:

- `app`: 68 ملف.
- `components`: 12 ملف.
- `lib`: 24 ملف.
- `supabase`: 12 ملف.

أهم المسارات:

- `app`: صفحات الموقع، صفحات الأدمن، Route Handlers.
- `components`: مكونات الواجهة مثل Navbar وProductCard وProductGrid وPromos.
- `context`: Auth/Cart/Checkout/Language/OrderTracking.
- `lib`: Supabase clients، صلاحيات الأدمن، خدمات الطلبات والسلة، الصور، الاستيراد، Redis، Sentry/rate limit.
- `supabase/migrations`: عقود قاعدة البيانات ومنطق الطلب الذري.
- `public`: الصور، الخطوط، الأيقونات، منتجات محلية.

## 7. المكتبات والاعتمادات

أهم الاعتمادات من `package.json`:

- `next@14.2.5`
- `react@18.2.0`
- `@supabase/supabase-js@^2.97.0`
- `@supabase/ssr@^0.9.0`
- `@supabase/auth-helpers-nextjs@^0.15.0`
- `@sentry/nextjs@^10.51.0`
- `@upstash/redis@^1.37.0`
- `xlsx@^0.18.5`
- `qrcode@^1.5.4`
- `@react-pdf/renderer@^4.3.2`
- `lucide-react@^0.577.0`
- `swiper@^11.0.0`
- `@capacitor/core@^8.3.4`

لا توجد توصية بإضافة مكتبات جديدة حاليا.

## 8. إعدادات Next.js وSentry

`next.config.js`:

- `reactStrictMode: true`.
- يسمح بصور Supabase domain: `bdmumdbykzbozgkxtsmk.supabase.co`.
- يحتوي `outputFileTracingExcludes` لتقليل تتبع ملفات ضخمة في API upload/products/import.
- مدمج مع Sentry عبر `withSentryConfig`.
- Sentry org: `cesar-store`.
- Sentry project: `javascript-nextjs`.
- tunnel route: `/monitoring`.

Sentry مفعل في:

- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation-client.ts`

ملاحظة تقييمية: إعداد `tracesSampleRate: 1` و`sendDefaultPii: true` مفيد أثناء التشخيص لكنه قد يكون ثقيلا أو حساسا في الإنتاج الواسع. لا يتم تغييره الآن بدون قرار واضح.

## 9. TypeScript والجودة

`tsconfig.json`:

- `strict: false`.
- `allowJs: true`.
- `skipLibCheck: true`.
- `incremental: true`.

التقييم: هذا مناسب لمرحلة التطوير السريع، لكنه يقلل صلابة المشروع على المدى الطويل. لا يجب تفعيل `strict` دفعة واحدة. إن تم تحسينه لاحقا فيكون تدريجيا وعلى ملفات محددة بعد وجود اختبارات.

## 10. Middleware وحماية الأدمن

`middleware.ts` يحمي:

- `/admin/:path*`
- `/api/admin/:path*`

آلية الحماية:

- السماح بـ `/admin-login` و`/api/admin/login`.
- البحث عن كوكي جلسة الأدمن.
- تحليل الكوكي عبر `parseAdminSessionCookie`.
- التحقق من HMAC باستخدام `ADMIN_SESSION_SECRET`.
- في حالة API يرجع 401، وفي الصفحات يعيد التوجيه إلى `/admin-login`.
- يضيف الهيدر `x-admin-pathname` لاستخدامه داخل `app/admin/layout.tsx`.

مهم: الـ Middleware يتحقق من جلسة الأدمن فقط. تقسيم الصلاحيات الكامل يتم بعد ذلك داخل `lib/admin/permissions.ts` اعتمادا على جلسة الأدمن + مستخدم Supabase المسجل.

## 11. منطق تسجيل الدخول

الملفات الأساسية:

- `context/AuthContext.tsx`
- `app/auth/login/page.tsx`
- `app/auth/callback/route.ts`
- `app/auth/sync/page.tsx`
- `hooks/useRequireAuth.ts`

المنطق الحالي:

- Supabase SSR/browser clients مستخدمة للجلسات.
- تسجيل الدخول بالبريد وكلمة المرور يتم من صفحة `/auth/login`.
- Google OAuth يتم عبر `signInWithGoogle`.
- redirect آمن فقط إذا بدأ بـ `/` وليس `//`.
- في Google OAuth يتم حفظ:
  - `oauth_redirect`
  - `last_redirect`
  - نسخة guest cart في `cesar_store_oauth_guest_cart`.
- callback route يستبدل code بجلسة ثم يوجه إلى `/auth/sync?redirect=...`.
- إذا كان المستخدم مسجلا بالفعل في صفحة login يتم `router.replace(target)`.

تعديل قيد العمل حاليا:

- `app/auth/login/page.tsx` يحتوي منطق إخفاء زر Google داخل تطبيق Android فقط.
- الكشف يتم عبر:
  - `navigator.userAgent.includes("CesarStoreApp/Android")`
  - أو `localStorage.cesar_store_mobile_app === "android"`.
- هذا التعديل يحتاج نشر الموقع وإعادة تشغيل/تثبيت تطبيق Android حتى يظهر أثره.

مخاطر يجب الانتباه لها:

- Google OAuth داخل WebView ممنوع من Google ويظهر `403 disallowed_useragent`.
- الحل التجاري الأفضل لاحقا: PWA حاليا، ثم TWA لتطبيق Google Play بدل WebView إذا كان Google login مطلوبا داخل التطبيق.

## 12. منطق السلة

الملفات الأساسية:

- `context/CartContext.tsx`
- `app/api/cart/items/route.ts`
- `app/api/cart/merge/route.ts`
- `lib/services/cartService.ts`
- migration: `2026051501_unify_atomic_cart_order.sql`

التخزين المحلي:

- `cesar_store_cart_v2`
- `cesar_store_oauth_guest_cart`

المنطق الحالي:

- العميل يستطيع إضافة منتجات قبل تسجيل الدخول في localStorage.
- عند تسجيل الدخول يتم دمج guest cart مع سلة المستخدم.
- لكل مستخدم مسجل سلة active واحدة بفضل:
  - منطق التطبيق.
  - index في قاعدة البيانات `idx_carts_one_active_per_user`.
- يمنع تكرار نفس المنتج داخل نفس السلة عبر:
  - منطق الدمج.
  - index `idx_cart_items_one_product_per_cart`.
- `cart_items` يتم سحبها من قاعدة البيانات للمستخدم المسجل وتطبيعها.
- إضافة/تعديل/حذف الكميات يتحقق من المخزون في السيرفر.
- عند فشل Redis rate limit يفشل النظام fail-open ولا يمنع المستخدم.

ملاحظات:

- توجد رسائل عربية ظهرت مشوهة في إخراج PowerShell بسبب encoding/console أو النصوص المصدرية. لا يتم إصلاحها جماعيا بدون فحص بصري.
- وجود `cart_items` في قاعدة البيانات ليس بالضرورة خللا، لأنه قد يكون لعميل لم يكمل الطلب.

## 13. منطق Checkout

الملفات الأساسية:

- `app/(checkout)/checkout/page.tsx`
- `app/(checkout)/review/page.tsx`
- `app/(checkout)/confirm/ConfirmClient.tsx`
- `context/CheckoutContext.tsx`

المسار الحالي:

1. العميل يضيف للسلة.
2. عند دخول checkout بدون تسجيل يتم توجيهه إلى `/auth/login?redirect=/checkout`.
3. بعد تسجيل الدخول يعود إلى المسار المطلوب.
4. صفحة checkout تجمع الاسم والهاتف والمدينة والعنوان والملاحظات.
5. صفحة review تنشئ الطلب عبر `/api/orders`.
6. بعد نجاح الطلب:
   - يتم حفظ سجل محلي بسيط للطلب.
   - يتم فتح WhatsApp برسالة الطلب إلى `201211120208`.
   - يتم تفريغ السلة محليا بدون مزامنة حذف إضافية لأن RPC/API يعالج السلة.
   - يتم التوجيه إلى `/confirm?orderId=...`.

ملاحظة تقنية:

- `CheckoutContext.submitOrder` يحتوي منطق إنشاء طلب أيضا، لكن المسار الفعلي المستخدم في الواجهة يبدو أنه `review/page.tsx`.
- هذه ازدواجية تحتاج تنظيف لاحق فقط بعد وجود اختبار checkout كامل، لأنها منطقة حساسة.

## 14. منطق الطلبات الذري

الملفات الأساسية:

- `app/api/orders/route.ts`
- `app/api/orders/[id]/route.ts`
- `supabase/migrations/2026050902_create_order_atomic_rpc.sql`
- `supabase/migrations/2026051501_unify_atomic_cart_order.sql`

المنطق الحالي:

- إنشاء الطلب يتم عبر RPC باسم `create_order_atomic`.
- يتم استخدام `order_token` لمنع تكرار الطلب عند إعادة الإرسال.
- يتم قفل العملية عبر `pg_advisory_xact_lock`.
- يتم التحقق من المخزون داخل قاعدة البيانات.
- يتم خصم المخزون داخل transaction.
- عند نفاد المخزون يرجع API خطأ 409 بمعلومات المنتج والكمية المتاحة.
- بعد إنشاء الطلب يتم:
  - حفظ `orders`.
  - حفظ `order_items`.
  - حفظ `order_tracking_events` بحالة `requested`.
  - تفريغ `cart_items` للسلات active الخاصة بالمستخدم.
  - تحويل السلات active إلى `ordered`.
- في حالة تكرار `order_token` يتم إعادة نفس الطلب ولا يتم إنشاء طلب جديد.

التقييم:

هذا من أقوى أجزاء المشروع. وجود الطلب الذري داخل قاعدة البيانات يقلل خطر الطلبات المكررة أو خصم المخزون غير الصحيح.

## 15. تتبع الطلب للعميل

الملفات الأساسية:

- `app/orders/page.tsx`
- `app/orders/[id]/page.tsx`
- `app/api/orders/[id]/route.ts`
- `context/OrderTrackingContext.tsx`

المنطق الحالي:

- العميل يرى طلباته من `/orders`.
- تفاصيل طلب معين من `/orders/[id]`.
- API يتحقق أن الطلب يخص نفس `user_id`.
- Realtime يستمع إلى `order_tracking_events`.
- timeline القياسي:
  - `requested`
  - `confirmed`
  - `preparing`
  - `shipped`
  - `delivered`

ملاحظات:

- `OrderTrackingContext` ما زال يحتفظ بتتبع محلي في localStorage كطبقة قديمة/مساعدة.
- مصدر الحقيقة الفعلي للطلبات هو قاعدة البيانات و`order_tracking_events`.

## 16. منطق الأدمن والصلاحيات

الملفات الأساسية:

- `app/admin/layout.tsx`
- `app/admin/AdminClientLayout.tsx`
- `lib/admin/permissions.ts`
- `lib/admin/validateAdminSession.ts`
- `lib/admin/session-core.ts`
- `lib/admin/adminSessionStore.ts`
- `app/admin-login/page.tsx`
- `app/api/admin/login/route.ts`
- `app/api/admin/logout/route.ts`

النموذج الحالي:

- دخول الأدمن التقليدي ينشئ جلسة أدمن موقعة.
- دخول الأدمن وحده لا يكفي لصفحات `/admin`.
- `app/admin/layout.tsx` يتطلب:
  - جلسة أدمن صحيحة.
  - مستخدم Supabase مسجل.
  - بريد المستخدم ضمن الصلاحيات.
- `full` admin:
  - البريد الافتراضي الثابت: `mohamed.seeking@gmail.com`.
  - بالإضافة إلى `SUPER_ADMIN_EMAIL`.
- `orders` admin:
  - من `ORDER_ADMIN_EMAILS`.
- أي بريد آخر لا يحصل على role.

المسارات المسموحة:

- `full`: كل شاشة الأدمن.
- `orders`: فقط `/admin/orders` وتفاصيل الطلب `/admin/orders/[id]`.
- لا يسمح لـ `orders` بدخول الأرشيف أو المنتجات أو التصنيفات أو التحليلات أو الأخطاء.

مهم:

- إذا ظهر للمستخدم صلاحيات كاملة بعد تغيير الصلاحيات، غالبا السبب عدم نشر آخر commit أو جلسة/صفحة قديمة تحتاج refresh وتسجيل دخول من جديد.

## 17. شاشة الطلبات في الأدمن

الملفات الأساسية:

- `app/admin/orders/page.tsx`
- `app/admin/orders/[id]/page.tsx`
- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[orderId]/route.ts`
- `app/api/admin/order-tracking/route.ts`
- `app/api/admin/orders/delete/route.ts`
- `app/api/admin/orders/restore/route.ts`
- `app/api/admin/orders/hard-delete/route.ts`

القدرات الحالية:

- عرض الطلبات غير المؤرشفة.
- فلترة بالبحث والحالة والتاريخ.
- pagination.
- تصدير CSV.
- أرشفة الطلبات المحددة.
- تفاصيل الطلب.
- تحديث الحالة حسب transitions مسموحة.
- إلغاء الطلب يعيد المخزون للمنتجات إذا نجح.
- Realtime refresh للتتبع.
- تقرير PDF داخل تفاصيل الطلب.

Transitions الحالية:

- `requested` إلى `confirmed` أو `canceled`.
- `confirmed` إلى `preparing` أو `canceled`.
- `preparing` إلى `shipped`.
- `shipped` إلى `delivered`.
- `delivered` لا ينتقل.
- `canceled` لا ينتقل.

ملاحظات مهمة:

- أرشفة الطلب لا تغير الحالة.
- Restore للأرشيف يزيل `archived_at` فقط، فيعود الطلب بحالته السابقة.
- hard delete متاح فقط لـ `full`.
- الأرشيف restore وhard delete مقيدان بـ `full`.

## 18. تقرير PDF للطلب

الملف:

- `app/api/admin/orders/[orderId]/report/route.ts`

القدرات:

- متاح لأدوار `full` و`orders`.
- يولد PDF باستخدام `@react-pdf/renderer`.
- يحتوي معلومات العميل:
  - الاسم.
  - الهاتف.
  - العنوان.
  - البريد إن وجد.
- يحتوي معلومات الطلب والمنتجات والإجمالي.
- يولد QR code باستخدام `qrcode`.
- QR يوجه إلى:
  - `/auth/login?redirect=/orders/{orderId}`
- بعد نجاح تسجيل العميل يدخل إلى تفاصيل طلبه.

التقييم:

تم تنفيذ الميزة بدون إنشاء منطق دخول منفصل. تعتمد على نفس Login وredirect الموجودين، وهذا هو الخيار الأقل خطورة.

## 19. المنتجات والتصنيفات والمتجر

الملفات الأساسية:

- `app/shop/page.tsx`
- `components/product/ProductGrid.tsx`
- `components/product/ProductCard.tsx`
- `app/product/[id]/page.tsx`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/categories/route.ts`
- `lib/filters.ts`
- `lib/category-normalizer.ts`

القدرات الحالية:

- عرض المنتجات النشطة فقط ذات مخزون أكبر من صفر في shop.
- البحث بالاسم العربي أو الإنجليزي.
- فلترة حسب القسم.
- ترتيب افتراضي حسب ترتيب القسم في landing/categories ثم أبجدي داخل القسم.
- ترتيب بالسعر تصاعدي/تنازلي.
- product card يدعم فتح الصورة في modal.
- product detail يعرض breadcrumb إلى القسم.
- تم إصلاح توافق قسم إضاءات السيارات عبر `normalizeCategory`.

ترتيب الأقسام الحالي من قاعدة البيانات:

1. `air-fresheners`
2. `Accessories`
3. `additives-fluids`
4. `cars lights`
5. `detergent`
6. `equipment`

ملاحظة:

- أسماء التصنيفات في قاعدة البيانات ليست كلها normalized بنفس الشكل (`Accessories`, `cars lights`) لكن الكود يعالج ذلك عبر `normalizeCategory`.

## 20. شاشة admin/products

الملف:

- `app/admin/products/page.tsx`

القدرات:

- عرض المنتجات.
- إحصائيات إجمالي/متوفر/منخفض/غير متوفر.
- بحث.
- فلترة بالمخزون.
- فلترة بالتصنيف.
- حذف مفرد أو متعدد.
- إضافة منتج.
- تعديل منتج.
- استيراد Excel.
- تصدير Excel بنفس أعمدة الاستيراد تقريبا:
  - `name_ar`
  - `name_en`
  - `description_ar`
  - `description_en`
  - `price`
  - `stock`
  - `category`
  - `images`
  - `badge`
  - `active`

ملاحظات:

- الزر موجود في الكود باسم "تصدير Excel".
- إذا لم يظهر في الإنتاج يجب التحقق من الفرع، push، merge إلى `main`، ونشر Vercel.

## 21. استيراد المنتجات والصور

الملفات:

- `app/api/admin/products/import/route.ts`
- `app/api/admin/products/import/[jobId]/route.ts`
- `lib/server/product-import.ts`
- `app/api/upload/route.ts`
- `lib/server/media-assets.ts`

المنطق الحالي:

- الاستيراد ينشئ import job في قاعدة البيانات.
- يتم تجهيز الصفوف والتحقق من الحقول.
- يتم منع تكرار المنتج عبر مفتاح: اسم عربي + تصنيف normalized.
- يتم رفع الصور أو إعادة استخدامها حسب hash.
- concurrency رفع الصور = 3.
- chunk size = 12.
- `media_assets` يحفظ:
  - hash
  - storage path
  - public url
  - mime
  - الحجم
  - الاسم الأصلي
- حذف/تعديل المنتج ينظف الصور المدارة غير المستخدمة بواسطة منتجات أخرى.

مخاطر مستقبلية:

- تنظيف الصور حاليا يعتمد على استخدام المنتجات فقط، وليس التصنيفات أو العروض.
- الخطة الآمنة لاحقا: جعل `media_assets` مصدر الحقيقة ثم إضافة شاشة صيانة للصور غير المستخدمة قبل الحذف.

## 22. Promo والعروض

الملفات:

- `app/api/promos/route.ts`
- `app/admin/promos/page.tsx`
- `components/promo/ShopSidePromoSlider.tsx`
- `components/promo/SidePromoCard.tsx`

قاعدة البيانات بها 4 صفوف في جدول `promos`.

تظهر العروض الجانبية في shop عبر `shop_left` و`shop_right` إذا كانت `isActive`.

## 23. Sentry وشاشة الأخطاء

الملفات:

- `app/api/admin/errors/route.ts`
- `app/admin/errors/page.tsx`
- إعدادات Sentry المذكورة أعلاه.

الحالة:

- شاشة الأخطاء تقرأ من Sentry API.
- تتطلب `SENTRY_AUTH_TOKEN`.
- متاحة لـ `full` admin فقط.
- الحذف/الإخفاء من شاشة الأدمن لا يعني حذف الخطأ من Sentry.

الأتمتة:

- تم تجهيز فكرة أتمتة قراءة Sentry كل ساعة بشكل read-only.
- المراقبة الحقيقية المفضلة هي من Sentry وليس عبر ضغط الموقع نفسه.

## 24. Rate limit وRedis

الملفات:

- `lib/rateLimit.ts`
- `lib/infra/redis.ts`
- `lib/redis.ts`

الاستخدامات:

- `/api/orders`
- `/api/cart/items`
- `/api/admin/order-tracking`
- `/api/admin/analytics/reset`

التقييم:

- وجود Redis rate limiting جيد.
- السياسة الحالية fail-open إذا Redis فشل. هذا يحافظ على تجربة المستخدم لكنه يقلل الحماية وقت تعطل Redis.

## 25. تصفير بيانات الاختبار

الملف:

- `app/api/admin/analytics/reset/route.ts`

الحماية الحالية:

- require `full`.
- يتحقق من مستخدم Supabase الحالي.
- يطابق بريد المستخدم مع `SUPER_ADMIN_EMAIL`.
- يستخدم `RESET_SECRET` في الدالة `validateResetSecret` لكن حسب القراءة الحالية لا يظهر أنها مستدعاة فعليا داخل `POST`.
- rate limit: 3 في الدقيقة.
- يعيد المخزون للطلبات غير الملغاة قبل حذف الطلبات.
- يحاول حذف optional dependencies مثل `order_items` و`invoices`.

ملاحظة أمنية مهمة:

- يجب مراجعة استدعاء `validateResetSecret` لاحقا. وجود الدالة بدون استخدامها قد يعني أن شرط السر غير مفعل فعليا، رغم وجود قيود البريد والصلاحية. لا يتم تعديله الآن لأن هذا endpoint حساس ويحتاج اختبار.

## 26. قاعدة البيانات: قراءة فعلية آمنة

تم استخدام Supabase service key محليا للقراءة فقط، بدون طباعة المفتاح أو بيانات العملاء.

وقت الفحص UTC تقريبا: `2026-05-23T11:15:50.245Z`.

الجداول وعدد الصفوف:

- `users`: 10
- `products`: 238
- `categories`: 6
- `promos`: 4
- `carts`: 3
- `cart_items`: 0
- `orders`: 0
- `order_items`: 0
- `order_tracking_events`: 0
- `invoices`: 0
- `media_assets`: 331
- `import_jobs`: 5
- `admin_audit_logs`: 0

أعمدة مهمة تم رصدها:

- `users`: `id`, `email`, `name`, `avatar_url`, `providers`, `is_admin`, `created_at`, `phone`, `is_catalog_admin`, `role`.
- `products`: `id`, `name_ar`, `name_en`, `description_ar`, `description_en`, `price`, `image_url`, `stock`, `is_active`, `created_at`, `updated_at`, `category`, `images_json`, `slug`, `low_stock_threshold`.
- `categories`: `id`, `category`, `image`, `en`, `ar`, `active`, `order`, `createdAt`, `updatedAt`.
- `promos`: `id`, `position`, `is_active`, `product_id`, `title`, `description`, `cta`, `created_at`, `updated_at`.
- `carts`: `id`, `user_id`, `anonymous_id`, `status`, `created_at`, `updated_at`.
- `media_assets`: `id`, `hash`, `storage_path`, `public_url`, `mime_type`, `byte_size`, `original_name`, `created_at`, `updated_at`.
- `import_jobs`: `id`, `file_name`, `status`, `rows_total`, `rows_processed`, `rows_success`, `rows_failed`, `rows_skipped`, `next_index`, `rows_json`, `known_product_keys_json`, `image_cache_json`, `failures_json`, `last_error`, `started_at`, `finished_at`, `created_at`, `updated_at`.

بعض الجداول كانت فارغة، لذلك لم يمكن استخراج الأعمدة منها من عينة صف، لكن migrations تحددها.

## 27. إحصاءات المنتجات من قاعدة البيانات

إجمالي المنتجات: 238.

الحالة العامة:

- active: 235.
- inactive: 3.
- out of stock: 3.
- low stock: 13.
- total stock units: 10733.

حسب التصنيف:

- `air-fresheners`: 113 منتج، 111 active، 2 inactive/out of stock، إجمالي مخزون 5550.
- `additives-fluids`: 6 منتجات، كلها active، إجمالي مخزون 300.
- `detergent`: 42 منتج، كلها active، إجمالي مخزون 2100.
- `cars-accessories`: 65 منتج، 64 active، 1 inactive/out of stock، 13 low stock، إجمالي مخزون 2405.
- `equipment`: 6 منتجات، كلها active، إجمالي مخزون 300.
- `cars-lights`: 6 منتجات، كلها active، إجمالي مخزون 78.

## 28. قاعدة البيانات: أهم العقود من migrations

`orders`:

- `id uuid primary key`
- `user_id`
- `order_number unique`
- `currency`
- `subtotal`
- `shipping_fee`
- `discount`
- `total`
- `customer_snapshot jsonb`
- `items_snapshot jsonb`
- `status`
- `updated_at`
- `confirmed_at`
- `closed_at`
- `order_token`
- `archived_at`

`order_tracking_events`:

- `id uuid primary key`
- `order_id`
- `status`
- `actor`
- `note`
- `created_at`
- foreign key على `orders(id)` مع cascade.

`order_items`:

- `id`
- `order_id`
- `product_id`
- `name`
- `price`
- `quantity`
- `image`

`media_assets`:

- hash unique.
- storage_path unique.
- public_url.

`import_jobs`:

- حالة job.
- counters.
- rows/failures/cache JSON.

قيود مهمة:

- unique order token لكل user: `idx_orders_user_order_token`.
- سلة active واحدة لكل user: `idx_carts_one_active_per_user`.
- منتج واحد لكل cart: `idx_cart_items_one_product_per_cart`.

## 29. تطبيق الموبايل المحلي

المسار:

- `D:\mohamed adel work\cesar-store app`

ملفات مهمة:

- `capacitor.config.ts`
- `android/app/src/main/java/com/cesareshop/app/MainActivity.java`

الإعداد الحالي:

- `appId`: `com.cesareshop.app`
- `appName`: `Cesar Store`
- `server.url`: `https://cesareshop.com`
- `appendUserAgent`: `CesarStoreApp/Android`
- `allowNavigation`: يتضمن الموقع، Supabase، Google.

`MainActivity.java` يحقن:

- `localStorage.cesar_store_mobile_app = android`
- `document.documentElement.dataset.cesarStoreApp = android`

الغرض:

- جعل الموقع يميز أن الصفحة مفتوحة داخل تطبيق Android.
- إخفاء Google login داخل التطبيق فقط.

حالة العمل:

- التطبيق اشتغل على الموبايل.
- Google login داخل WebView فشل بسبب سياسة Google `disallowed_useragent`.
- جاري التعامل مع الحل الآمن: إخفاء زر Google داخل التطبيق فقط، مع إبقاء Google login في الموقع/PWA.

ملاحظة مهمة:

- لم يتم التحقق من compile Android عبر سطر الأوامر بسبب إلغاء/إيقاف محاولة Gradle السابقة.
- يلزم اختبار Android Studio بعد نشر تعديل الموقع وإعادة تشغيل التطبيق.

## 30. PWA وTWA

الخلاصة المحفوظة:

- PWA حل مناسب حاليا، وقد يكون أفضل من WebView لأنه يستخدم متصفحا آمنا ويدعم Google login.
- Capacitor WebView لا يصلح كحل نهائي إذا كان Google login داخل التطبيق مطلوبا.
- الحل الأفضل عند تجهيز Google Play:
  - Trusted Web Activity.
  - حساب Google Play Developer.
  - package id: `com.cesareshop.app`.
  - keystore رسمي.
  - assetlinks.json على دومين الموقع.
  - manifest/service worker مضبوطين.

## 31. المشاكل/المخاطر الحالية ذات الأولوية

1. حالة Git غير نظيفة وفيها حذف صور كثيرة. لا يجب push/commit قبل مراجعتها.
2. تعديل إخفاء Google في التطبيق يحتاج نشر الموقع وإعادة اختبار التطبيق.
3. Google OAuth داخل WebView غير متوافق مع سياسات Google، والحل النهائي TWA أو PWA.
4. `validateResetSecret` موجود في reset route لكن يحتاج تأكيد أنه مستخدم فعليا قبل الاعتماد على secret كطبقة حماية.
5. يوجد ازدواج بين `CheckoutContext.submitOrder` و`review/page.tsx` في إنشاء الطلب.
6. Sentry sample وPII settings تحتاج قرار إنتاج لاحق.
7. `strict: false` يقلل صرامة TypeScript.
8. لا يوجد test suite آلي يحمي السلة والطلب والدخول.
9. تنظيف الصور ما زال يعتمد على المنتجات فقط وليس كل أماكن استخدام الصور.
10. بعض النصوص العربية في إخراج القراءة تظهر encoding غير مريح؛ أي تنظيف يجب أن يكون بصريا وملفا بملف.

## 32. ما تم إنجازه مؤخرا

- ترتيب shop افتراضيا حسب ترتيب الأقسام ثم أبجديا داخل القسم.
- تطبيق نفس الترتيب داخل القسم نفسه.
- إضافة زر تصدير Excel في `admin/products`.
- إضافة تقرير PDF داخل تفاصيل الطلب في الأدمن.
- QR في التقرير يوجه العميل لتتبع الطلب بعد تسجيل الدخول.
- إضافة تقسيم صلاحيات الأدمن:
  - full admin.
  - orders admin.
- إصلاح/توضيح مشكلة إلغاء الطلب بعد refresh وتسجيل الدخول الصحيح.
- إنشاء نسخة تطبيق Android محلية عبر Capacitor.
- إنشاء أيقونات/أصول تطبيق Android من لوجو المشروع.
- تحسين عرض shop على الموبايل.
- إصلاح breadcrumb لقسم إضاءات السيارات عبر normalizer.
- بدء تنفيذ إخفاء Google login داخل Android app فقط.
- تجهيز أتمتة مراقبة Sentry read-only كل ساعة.

## 33. خطة العمل الآمنة التالية

الأولوية 1: تثبيت حالة Git

- مراجعة الصور المحذوفة/المعدلة/untracked.
- تحديد هل التغييرات مقصودة.
- عدم commit قبل وضوح سبب تغييرات الصور.

الأولوية 2: إنهاء إخفاء Google داخل التطبيق

- نشر تعديل `app/auth/login/page.tsx`.
- تشغيل `npm run cap:sync` في نسخة التطبيق إن احتاج.
- فتح Android Studio وتشغيل التطبيق على الهاتف.
- اختبار أن Google button مختف داخل التطبيق.
- اختبار أن Google button ما زال ظاهر ويعمل على الموقع/PWA.

الأولوية 3: مراجعة reset endpoint

- قراءة `app/api/admin/analytics/reset/route.ts` فقط.
- التأكد من استخدام `validateResetSecret`.
- أي تعديل هنا يجب أن يكون جراحيا جدا ومتبوعا باختبار أدمن كامل.

الأولوية 4: اختبار checkout كامل

- مستخدم guest يضيف منتج.
- يضغط checkout.
- ينتقل login.
- يسجل بريد وكلمة مرور.
- يعود checkout.
- يتم دمج السلة.
- يراجع الطلب.
- يتم إنشاء الطلب.
- يفتح WhatsApp.
- يتم تفريغ السلة.
- يظهر الطلب في My Orders.
- يتغير في admin ويتحدث عند العميل.

الأولوية 5: خطة TWA/Google Play

- استكمال حساب Google Play Developer.
- تجهيز TWA بدلا من WebView لو الهدف تطبيق Play Store يدعم Google login.
- عدم الاعتماد على WebView كحل نهائي لـ OAuth.

## 34. تعليمات للشات الجديد

ابدأ دائما بهذه الخطوات:

1. اقرأ هذه الوثيقة.
2. افحص `git status --short`.
3. لا تفترض أن تغييرات `emergency-recovery` وصلت إلى production.
4. إذا كان المطلوب متعلق بالدخول/السلة/checkout/orders، اقرأ الملفات المرتبطة قبل أي تعديل.
5. لا تشغل `npm run build` إلا بطلب صريح.
6. لا تطبع `.env.local`.
7. عند التعامل مع Supabase اقرأ ولا تعدل إلا بموافقة واضحة.
8. في أي تعديل، نفذ أقل تغيير ممكن، ثم شغل فحصا آمنا.

## 35. خلاصة تقييم الجاهزية

المشروع من ناحية الوظائف الأساسية في حالة جيدة:

- المتجر يعمل.
- المنتجات والتصنيفات متصلة بقاعدة البيانات.
- السلة لديها منطق guest/user merge.
- checkout متصل بالطلب الذري.
- المخزون يخصم داخل قاعدة البيانات.
- الطلبات لها tracking.
- الأدمن قادر على متابعة الطلبات والمنتجات والتصنيفات والعروض.
- PDF report موجود.
- Sentry وRedis موجودان.

لكن المشروع ليس في حالة تسمح بتغييرات كبيرة عشوائية. أفضل مسار هو تثبيت الإنتاج، مراقبة الأخطاء، وتنفيذ تحسينات صغيرة جدا مع اختبار بعد كل خطوة.

التقييم العملي الحالي:

- جاهزية تشغيل حذر: عالية.
- جاهزية تسويق واسع بدون مراقبة: متوسطة.
- جاهزية تطوير مزايا كبيرة قبل الإطلاق: غير مفضلة.
- أهم خطر مباشر: حالة Git غير النظيفة وتغييرات الصور غير المحسومة.

