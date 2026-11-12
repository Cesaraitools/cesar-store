import type { Metadata } from "next";
import { absoluteUrl, CONTACT_EMAIL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description:
    "سياسة الخصوصية الخاصة بمتجر سيزر وطريقة التعامل مع بيانات العملاء وبيانات التواصل عبر الموقع ومنصات Meta.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "سياسة الخصوصية",
    description:
      "تعرف على كيفية جمع واستخدام وحماية بيانات العملاء في متجر سيزر.",
    url: absoluteUrl("/privacy-policy"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <section className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">سياسة الخصوصية</h1>
          <p className="leading-8 text-slate-600">
            توضح هذه السياسة كيفية تعامل متجر سيزر مع بيانات العملاء عند استخدام
            الموقع أو التواصل معنا عبر فيسبوك، ماسنجر، واتساب، أو أي قناة تواصل
            رسمية تابعة للمتجر.
          </p>
          <p className="text-sm text-slate-500">آخر تحديث: 12 نوفمبر 2026</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">البيانات التي قد نجمعها</h2>
          <ul className="list-inside list-disc space-y-2 leading-8">
            <li>بيانات التواصل مثل الاسم، رقم الهاتف، البريد الإلكتروني، أو رابط الحساب عند الحاجة لخدمة العميل.</li>
            <li>بيانات الطلب مثل المنتجات المطلوبة، عنوان التوصيل، وحالة الطلب.</li>
            <li>محتوى الرسائل أو التعليقات التي يرسلها العميل للرد على الاستفسارات وتقديم الدعم.</li>
            <li>بيانات تقنية أساسية تساعد على تحسين تجربة الاستخدام وحماية الموقع من إساءة الاستخدام.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">كيفية استخدام البيانات</h2>
          <p className="leading-8">
            نستخدم البيانات لمعالجة الطلبات، الرد على الاستفسارات، تقديم خدمة
            العملاء، تحسين البحث وتجربة التسوق، وإرسال معلومات مرتبطة بالطلب أو
            المنتج عندما يكون ذلك ضروريًا.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">بيانات منصات Meta</h2>
          <p className="leading-8">
            عند التواصل مع متجر سيزر عبر فيسبوك أو ماسنجر، قد نستقبل بيانات
            محدودة من Meta مثل معرف الرسالة أو التعليق ومحتوى الرسالة أو التعليق
            وبيانات الصفحة المرتبطة بها، وذلك للرد على العميل أو تحويل الاستفسار
            لمراجعة بشرية عند الحاجة.
          </p>
          <p className="leading-8">
            يستخدم تطبيق <span dir="ltr">Cesar Social Publisher</span> صلاحيات
            Meta الممنوحة له لنشر صور منتجات متجر سيزر والنصوص المعتمدة على صفحة
            فيسبوك وحساب إنستغرام المهني اللذين يديرهما المتجر. وقد يعالج التطبيق
            معرف الصفحة أو الحساب، اسم الصفحة أو اسم المستخدم، حالة صلاحية رمز
            الوصول، ومعرف المنشور ورابطه بعد النشر. لا يستخدم نظام النشر هذه
            الصلاحيات للوصول إلى الحسابات الشخصية للعملاء أو النشر عليها.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">الذكاء الاصطناعي في إعداد المنشورات</h2>
          <p className="leading-8">
            قد نرسل إلى مزود خدمة الذكاء الاصطناعي بيانات كتالوج المنتجات العامة
            فقط، مثل اسم المنتج ووصفه وصورته ورابطه، لإعداد مسودة نص دعائي يراجعها
            مسؤول المتجر قبل اعتمادها. لا نرسل لهذا الغرض رسائل العملاء أو بيانات
            طلباتهم أو رموز الوصول إلى حسابات Meta.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">مشاركة البيانات</h2>
          <p className="leading-8">
            لا نبيع بيانات العملاء. قد نشارك بيانات محدودة فقط مع خدمات ضرورية
            لتنفيذ الطلب أو الدعم مثل شركات الشحن، مزودي الاستضافة، أدوات الدفع
            أو التواصل، وذلك في حدود الغرض المطلوب.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">حماية البيانات والاحتفاظ بها</h2>
          <p className="leading-8">
            نحتفظ بالبيانات بالقدر اللازم لتقديم الخدمة، متابعة الطلبات، تحسين
            الدعم، والالتزام بالمتطلبات القانونية أو التشغيلية. ونتخذ إجراءات
            مناسبة للحد من الوصول غير المصرح به إلى البيانات.
          </p>
          <p className="leading-8">
            تحفظ رموز الوصول ومفاتيح تطبيق Meta في بيئة خادم محمية ولا ترسل إلى
            متصفح العميل. ويقتصر الوصول إلى لوحة النشر وسجل المحاولات على مسؤولي
            المتجر المصرح لهم.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">طلب حذف البيانات</h2>
          <p className="leading-8">
            يمكن للعميل طلب حذف بياناته أو الاستفسار عن طريقة استخدامها عبر
            التواصل معنا على البريد الإلكتروني:{" "}
            <a className="font-semibold text-blue-700" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تحديث السياسة</h2>
          <p className="leading-8">
            قد يتم تحديث هذه السياسة من وقت لآخر لتوضيح إجراءاتنا أو الالتزام
            بمتطلبات المنصات والخدمات التي يستخدمها متجر سيزر.
          </p>
        </div>
      </section>
    </main>
  );
}
