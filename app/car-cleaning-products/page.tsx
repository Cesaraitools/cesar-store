import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "منتجات تنظيف السيارات",
  description:
    "دليل اختيار منتجات تنظيف السيارات من متجر سيزر، يشمل منظفات داخلية وخارجية ونصائح لاختيار المنتج المناسب داخل مصر.",
  alternates: {
    canonical: "/car-cleaning-products",
  },
  openGraph: {
    title: "منتجات تنظيف السيارات | Cesar Store",
    description:
      "تعرف على أنواع منتجات تنظيف السيارات وكيف تختار المنتج المناسب من متجر سيزر.",
    url: absoluteUrl("/car-cleaning-products"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const cleaningTypes = [
  {
    title: "منظفات داخلية",
    text: "تستخدم للعناية بالأجزاء الداخلية حسب نوع المنتج، مثل الأسطح، التابلوه، أو المناطق التي تحتاج تنظيفا خفيفا.",
  },
  {
    title: "منظفات خارجية",
    text: "تساعد على تنظيف الأجزاء الخارجية من السيارة وإزالة الأتربة أو الاتساخات حسب طريقة الاستخدام الموضحة للمنتج.",
  },
  {
    title: "منتجات العناية السريعة",
    text: "مناسبة للاستخدام اليومي أو بين مرات الغسيل الأساسية للحفاظ على مظهر السيارة.",
  },
  {
    title: "أدوات مساعدة للتنظيف",
    text: "تشمل الأدوات التي تساعد في استخدام منتجات التنظيف بطريقة أسهل وأكثر تنظيما.",
  },
];

const tips = [
  "حدد هل تريد تنظيفا داخليا أو خارجيا قبل اختيار المنتج.",
  "راجع وصف المنتج والصور لمعرفة الاستخدام المناسب.",
  "لا تستخدم أي منتج على سطح غير مناسب إلا إذا كان الوصف يسمح بذلك.",
  "ابدأ بكمية بسيطة عند تجربة منتج جديد.",
  "تأكد من السعر والتوفر من صفحة المنتج قبل الطلب.",
];

const faqs = [
  {
    question: "ما الفرق بين منتجات التنظيف الداخلية والخارجية؟",
    answer:
      "منتجات التنظيف الداخلية موجهة للأجزاء داخل السيارة، بينما الخارجية تستخدم عادة على جسم السيارة أو الأسطح الخارجية حسب وصف المنتج.",
  },
  {
    question: "هل يمكن استخدام نفس المنظف لكل أجزاء السيارة؟",
    answer:
      "ليس دائما. يجب مراجعة وصف المنتج وطريقة الاستخدام، لأن بعض المنتجات مخصصة لأسطح أو استخدامات معينة.",
  },
  {
    question: "كيف أعرف المنتج المناسب لتنظيف سيارتي؟",
    answer:
      "حدد الجزء الذي تريد تنظيفه ونوع الاتساخ، ثم راجع وصف المنتج والصور وحالة التوفر داخل صفحة المنتج.",
  },
  {
    question: "هل منتجات التنظيف متاحة للطلب أونلاين؟",
    answer:
      "نعم، يمكن تصفح منتجات التنظيف المتاحة في متجر سيزر وطلب المنتج من صفحة المتجر أو صفحة المنتج.",
  },
];

export default function CarCleaningProductsPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "منتجات تنظيف السيارات",
      url: absoluteUrl("/car-cleaning-products"),
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: cleaningTypes.map((item) => item.title),
      description: "دليل لاختيار منتجات تنظيف السيارات الداخلية والخارجية من Cesar Store.",
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
    <main className="mx-auto max-w-5xl px-4 py-10 text-slate-800" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="space-y-9 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">منتجات تنظيف السيارات</h1>
          <p className="leading-8 text-slate-600">
            اختيار منتج تنظيف السيارة يعتمد على مكان الاستخدام ونوع الاتساخ والنتيجة
            المطلوبة. هذه الصفحة تساعدك على فهم الأنواع الأساسية قبل تصفح المنتجات
            المتاحة في متجر سيزر.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أنواع منتجات التنظيف</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cleaningTypes.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">نصائح قبل شراء منتج تنظيف</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح منتجات التنظيف</h2>
          <p className="leading-8 text-slate-600">
            صفحة المنتج هي المصدر الأدق للسعر، الصور، حالة التوفر، وأي مواصفات خاصة.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/car-care">
              منتجات العناية بالسيارات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/faq">
              الأسئلة الشائعة
            </Link>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن تنظيف السيارات</h2>
          {faqs.map((faq) => (
            <article key={faq.question} className="border-b border-slate-100 pb-5 last:border-0">
              <h3 className="font-bold text-slate-950">{faq.question}</h3>
              <p className="mt-2 leading-8 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
