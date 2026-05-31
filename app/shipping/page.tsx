import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_WHATSAPP_URL, DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الشحن والتوصيل في متجر سيزر",
  description:
    "معلومات الشحن والتوصيل في متجر سيزر Cesar Store لطلبات منتجات السيارات داخل مصر، مع إرشادات إدخال بيانات الطلب والتواصل للمتابعة.",
  alternates: {
    canonical: "/shipping",
  },
  openGraph: {
    title: "الشحن والتوصيل في متجر سيزر | Cesar Store",
    description:
      "تعرف على إرشادات الشحن والتوصيل ومتابعة طلبات منتجات السيارات من متجر سيزر داخل مصر.",
    url: absoluteUrl("/shipping"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const deliveryNotes = [
  "يتم الاعتماد على بيانات الطلب التي يدخلها العميل للتواصل وتجهيز الشحن.",
  "يفضل إدخال رقم هاتف صحيح ومتاح، مع عنوان واضح ومكتمل قدر الإمكان.",
  "قد تختلف مدة الشحن حسب المدينة أو المحافظة أو ظروف شركة الشحن.",
  "يمكن التواصل عبر واتساب لمتابعة الطلب أو توضيح بيانات العنوان عند الحاجة.",
];

const faqs = [
  {
    question: "هل الشحن متاح داخل مصر؟",
    answer:
      "متجر سيزر يستهدف العملاء داخل مصر، ويتم التعامل مع طلبات الشحن والتوصيل حسب بيانات الطلب والمنطقة المتاحة للخدمة.",
  },
  {
    question: "كيف أساعد في وصول الطلب بدون تأخير؟",
    answer:
      "اكتب رقم هاتف صحيح، عنوان واضح، المحافظة أو المدينة، وأي علامة مميزة تساعد في توصيل الطلب.",
  },
  {
    question: "هل يمكن متابعة الطلب بعد تأكيده؟",
    answer:
      "نعم، يمكن التواصل مع متجر سيزر عبر واتساب لمتابعة الطلب أو توضيح بيانات إضافية عند الحاجة.",
  },
];

export default function ShippingPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "الشحن والتوصيل في متجر سيزر",
      url: absoluteUrl("/shipping"),
      inLanguage: "ar-EG",
      about: {
        "@type": "AutoPartsStore",
        name: SITE_NAME,
        url: absoluteUrl("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="space-y-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">الشحن والتوصيل في متجر سيزر</h1>
          <p className="leading-8 text-slate-600">
            هذه الصفحة توضح معلومات عامة عن الشحن والتوصيل لطلبات متجر سيزر داخل مصر،
            وكيفية إدخال بيانات تساعد في تجهيز الطلب والتواصل مع العميل بشكل صحيح.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">إرشادات الشحن</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {deliveryNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">بيانات مهمة عند الطلب</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-5">
              <h3 className="font-bold text-slate-950">بيانات التواصل</h3>
              <p className="mt-2 leading-8 text-slate-600">
                رقم الهاتف هو أهم وسيلة لتأكيد الطلب أو متابعة الشحن، لذلك يجب كتابته بدقة.
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-5">
              <h3 className="font-bold text-slate-950">بيانات العنوان</h3>
              <p className="mt-2 leading-8 text-slate-600">
                العنوان الواضح، المحافظة أو المدينة، وأي علامة مميزة تساعد في تقليل أخطاء التوصيل.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن الشحن</h2>
          {faqs.map((faq) => (
            <article key={faq.question} className="border-b border-slate-100 pb-4 last:border-0">
              <h3 className="font-bold text-slate-950">{faq.question}</h3>
              <p className="mt-2 leading-8 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/ordering-guide">
            دليل الطلب
          </Link>
          <a className="rounded-md bg-emerald-50 px-4 py-2 text-emerald-700" href={CONTACT_WHATSAPP_URL}>
            متابعة عبر واتساب
          </a>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/return-policy">
            سياسة الإرجاع والاستبدال
          </Link>
        </div>
      </section>
    </main>
  );
}
