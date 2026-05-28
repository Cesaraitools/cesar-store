import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "سياسة الإرجاع والاستبدال",
  description:
    "سياسة الإرجاع والاستبدال الخاصة بمتجر سيزر لطلبات منتجات وإكسسوارات السيارات داخل مصر.",
  alternates: {
    canonical: "/return-policy",
  },
  openGraph: {
    title: "سياسة الإرجاع والاستبدال",
    description:
      "تعرف على شروط الإرجاع والاستبدال في متجر سيزر داخل مصر.",
    url: absoluteUrl("/return-policy"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function ReturnPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <section className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">سياسة الإرجاع والاستبدال</h1>
          <p className="leading-8 text-slate-600">
            نحرص في متجر سيزر على أن تصل المنتجات للعميل بحالة جيدة ومطابقة
            للطلب. توضح هذه الصفحة شروط الإرجاع والاستبدال للطلبات داخل مصر.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">مدة طلب الإرجاع أو الاستبدال</h2>
          <p className="leading-8">
            يمكن طلب الإرجاع أو الاستبدال خلال 14 يومًا من تاريخ استلام الطلب،
            بشرط أن يكون المنتج غير مستخدم وبحالته الأصلية وبكامل الملحقات
            والتغليف كلما أمكن ذلك.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">المنتجات التالفة أو غير المطابقة</h2>
          <p className="leading-8">
            إذا وصل المنتج تالفًا أو غير مطابق للطلب، يرجى التواصل معنا في أقرب
            وقت مع إرسال رقم الطلب وصور توضح المشكلة. في هذه الحالة نتحمل
            مسؤولية الاستبدال أو الإرجاع حسب حالة الطلب وتوفر المنتج.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">شروط قبول الإرجاع</h2>
          <ul className="list-inside list-disc space-y-2 leading-8">
            <li>أن يكون المنتج غير مستخدم وغير تالف بسبب سوء الاستخدام.</li>
            <li>أن يكون المنتج بنفس الحالة التي تم استلامه بها.</li>
            <li>أن تتوفر بيانات الطلب أو وسيلة إثبات الشراء.</li>
            <li>قد لا تقبل المنتجات التي تم فتحها أو استخدامها إذا تعذر إعادة بيعها.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تكلفة الشحن</h2>
          <p className="leading-8">
            إذا كان سبب الإرجاع عيبًا في المنتج أو خطأ في الطلب، يتحمل متجر
            سيزر تكلفة الشحن المناسبة. أما إذا كان الإرجاع بسبب تغيير رأي العميل
            مع سلامة المنتج، فقد يتحمل العميل تكلفة الشحن حسب الحالة.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">طريقة التواصل</h2>
          <p className="leading-8">
            لطلب الإرجاع أو الاستبدال، يرجى التواصل معنا عبر صفحة فيسبوك أو
            وسائل التواصل الخاصة بمتجر سيزر مع توضيح رقم الطلب وسبب الطلب.
          </p>
        </div>
      </section>
    </main>
  );
}
