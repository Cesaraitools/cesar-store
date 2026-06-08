import type { Metadata } from "next";
import { absoluteUrl, CONTACT_EMAIL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "تعليمات حذف البيانات",
  description:
    "تعليمات طلب حذف بيانات المستخدمين من متجر سيزر والبيانات المرتبطة بالتواصل عبر منصات Meta.",
  alternates: {
    canonical: "/data-deletion",
  },
  openGraph: {
    title: "تعليمات حذف البيانات",
    description:
      "تعرف على طريقة طلب حذف بياناتك من متجر سيزر.",
    url: absoluteUrl("/data-deletion"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <section className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">تعليمات حذف البيانات</h1>
          <p className="leading-8 text-slate-600">
            إذا كنت ترغب في حذف بياناتك المرتبطة بمتجر سيزر أو بالتواصل معنا عبر
            فيسبوك أو ماسنجر، يمكنك إرسال طلب حذف البيانات باتباع الخطوات
            التالية.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">طريقة إرسال طلب الحذف</h2>
          <ol className="list-inside list-decimal space-y-2 leading-8">
            <li>
              أرسل رسالة إلى البريد الإلكتروني{" "}
              <a className="font-semibold text-blue-700" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </li>
            <li>اكتب في عنوان الرسالة: طلب حذف بيانات.</li>
            <li>اذكر وسيلة التواصل أو رقم الطلب أو رابط حساب فيسبوك المستخدم عند التواصل معنا، حتى نتمكن من تحديد البيانات المطلوبة.</li>
            <li>سنراجع الطلب ونحذف أو نخفي البيانات التي لا نحتاج للاحتفاظ بها لأسباب تشغيلية أو قانونية.</li>
          </ol>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">البيانات التي يشملها الطلب</h2>
          <p className="leading-8">
            قد يشمل طلب الحذف بيانات التواصل، رسائل الدعم، بيانات الطلبات غير
            الضرورية، أو بيانات التفاعل التي تم استخدامها للرد على الاستفسارات.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">مدة معالجة الطلب</h2>
          <p className="leading-8">
            نسعى لمعالجة طلبات حذف البيانات خلال مدة مناسبة بعد التحقق من هوية
            مقدم الطلب وتحديد البيانات المطلوبة.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">ملاحظات مهمة</h2>
          <p className="leading-8">
            قد نحتفظ ببعض البيانات إذا كانت ضرورية لإثبات الطلبات، منع الاحتيال،
            الامتثال للالتزامات القانونية، أو حل النزاعات، مع تقليل استخدامها
            قدر الإمكان.
          </p>
        </div>
      </section>
    </main>
  );
}
