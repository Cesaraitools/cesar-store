import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "شروط الخدمة والاستخدام",
  description:
    "شروط استخدام متجر سيزر وطلب منتجات وإكسسوارات السيارات والتواصل مع خدمة العملاء عبر الموقع ومنصات Meta.",
  alternates: {
    canonical: "/terms-of-service",
  },
  openGraph: {
    title: "شروط الخدمة والاستخدام | Cesar Store",
    description:
      "تعرف على شروط استخدام متجر سيزر والطلبات والشحن والإرجاع والتواصل عبر الموقع ومنصات Meta.",
    url: absoluteUrl("/terms-of-service"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <section className="space-y-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">شروط الخدمة والاستخدام</h1>
          <p className="leading-8 text-slate-600">
            تنظم هذه الشروط استخدام موقع متجر سيزر وخدماته، بما في ذلك تصفح المنتجات،
            إنشاء الحساب، تقديم الطلبات، والتواصل مع خدمة العملاء عبر الموقع أو القنوات
            الرسمية التابعة للمتجر. استخدامك للخدمة يعني موافقتك على هذه الشروط.
          </p>
          <p className="text-sm text-slate-500">آخر تحديث: 4 أغسطس 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">الحساب والاستخدام الصحيح</h2>
          <p className="leading-8 text-slate-600">
            يجب تقديم بيانات صحيحة عند إنشاء الحساب أو تنفيذ الطلب. ويتحمل المستخدم
            مسؤولية الحفاظ على سرية بيانات دخوله وعدم استخدام الموقع بطريقة غير قانونية،
            أو تعطيل الخدمة، أو محاولة الوصول إلى بيانات أو أنظمة غير مصرح بها.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">المنتجات والأسعار والتوفر</h2>
          <p className="leading-8 text-slate-600">
            نحرص على عرض معلومات وصور وأسعار المنتجات بصورة دقيقة. وقد يتغير السعر أو
            التوفر قبل تأكيد الطلب. لا يعد وضع المنتج في السلة تأكيدًا نهائيًا لتوفره،
            ويصبح الطلب قابلًا للتنفيذ بعد تسجيله ومراجعته والتواصل مع العميل عند الحاجة.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">الطلبات والشحن</h2>
          <p className="leading-8 text-slate-600">
            يعتمد تجهيز الطلب والشحن على البيانات التي يقدمها العميل، بما في ذلك رقم
            الهاتف والعنوان. تختلف مدة وتكلفة التوصيل حسب المنطقة والطلب وظروف شركة
            الشحن. تتوفر التفاصيل والإرشادات في صفحة{" "}
            <Link className="font-semibold text-blue-700" href="/shipping">
              الشحن والتوصيل
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">الإرجاع والاستبدال</h2>
          <p className="leading-8 text-slate-600">
            تخضع طلبات الإرجاع والاستبدال للمدة والحالة والشروط المنشورة في صفحة{" "}
            <Link className="font-semibold text-blue-700" href="/return-policy">
              سياسة الإرجاع والاستبدال
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">الخصوصية والتواصل عبر Meta</h2>
          <p className="leading-8 text-slate-600">
            نعالج البيانات اللازمة لتقديم الخدمة ومتابعة الطلبات والرد على الرسائل أو
            التعليقات الواردة عبر فيسبوك وماسنجر. توضح صفحة{" "}
            <Link className="font-semibold text-blue-700" href="/privacy-policy">
              سياسة الخصوصية
            </Link>{" "}
            أنواع البيانات المستخدمة وأغراضها، كما يمكن تقديم طلب حذف البيانات عبر صفحة{" "}
            <Link className="font-semibold text-blue-700" href="/data-deletion">
              حذف البيانات
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">تحديث الشروط والتواصل</h2>
          <p className="leading-8 text-slate-600">
            قد يتم تحديث هذه الشروط عند تطوير الخدمة أو تغير المتطلبات التشغيلية أو
            القانونية. تسري النسخة المنشورة على الموقع من تاريخ تحديثها. للاستفسار عن
            هذه الشروط، استخدم وسائل التواصل الرسمية في صفحة{" "}
            <Link className="font-semibold text-blue-700" href="/contact">
              التواصل معنا
            </Link>
            .
          </p>
        </section>
      </section>
    </main>
  );
}
