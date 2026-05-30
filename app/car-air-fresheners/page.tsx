import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "معطرات سيارات",
  description:
    "دليل اختيار معطرات السيارات من متجر سيزر: أنواع الروائح، طريقة الاستخدام، اختيار المعطر المناسب، وروابط المنتجات المتاحة داخل مصر.",
  alternates: {
    canonical: "/car-air-fresheners",
  },
  openGraph: {
    title: "معطرات سيارات | Cesar Store",
    description:
      "تعرف على معطرات السيارات وكيف تختار الرائحة وطريقة الاستخدام المناسبة من متجر سيزر.",
    url: absoluteUrl("/car-air-fresheners"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const scentTypes = [
  {
    title: "معطرات سبراي",
    text: "مناسبة للاستخدام السريع داخل السيارة، وتساعد على تجديد الرائحة عند الحاجة حسب تعليمات المنتج.",
  },
  {
    title: "معطرات معلقة أو ثابتة",
    text: "اختيار عملي لمن يريد رائحة مستمرة داخل السيارة، مع مراعاة مكان التثبيت وحجم السيارة.",
  },
  {
    title: "روائح هادئة",
    text: "مناسبة للاستخدام اليومي لمن يفضل رائحة غير حادة داخل السيارة، خصوصا في الرحلات الطويلة.",
  },
  {
    title: "روائح قوية أو مميزة",
    text: "تناسب من يريد رائحة واضحة داخل السيارة، مع استخدام معتدل حتى تظل التجربة مريحة.",
  },
];

const choosingTips = [
  "اختر نوع المعطر حسب طريقة الاستخدام: سبراي، معلق، ثابت، أو أي شكل آخر متاح.",
  "راجع اسم الرائحة وحجم العبوة أو المقاس إن كان مذكورا في صفحة المنتج.",
  "لو السيارة صغيرة، ابدأ برائحة هادئة أو استخدام أخف.",
  "تأكد من حالة التوفر والسعر من صفحة المنتج نفسها.",
  "لو المنتج له أكثر من رائحة أو مقاس، اختر الاختيار الصحيح قبل إضافته للسلة.",
];

const faqs = [
  {
    question: "ما أفضل معطر سيارة للاستخدام اليومي؟",
    answer:
      "أفضل معطر للاستخدام اليومي هو الذي تكون رائحته مناسبة لك وغير مزعجة داخل السيارة، مع اختيار طريقة استخدام تناسبك مثل سبراي أو معطر ثابت أو معلق.",
  },
  {
    question: "هل معطرات السيارات تختلف حسب الحجم أو الرائحة؟",
    answer:
      "نعم، قد تختلف معطرات السيارات حسب الرائحة والحجم وطريقة الاستخدام، لذلك يجب مراجعة صفحة المنتج واختيار الرائحة أو المقاس المتاح قبل الشراء.",
  },
  {
    question: "هل يمكن استخدام المعطر داخل كل السيارات؟",
    answer:
      "غالبية معطرات السيارات مناسبة للاستخدام داخل السيارة، لكن يجب الالتزام بطريقة الاستخدام الموضحة وتجنب الاستخدام المفرط أو وضع المنتج في مكان غير مناسب.",
  },
  {
    question: "كيف أعرف أن معطر السيارة متوفر حاليا؟",
    answer:
      "صفحة المنتج في متجر سيزر توضح حالة التوفر والسعر الحالي، وهي المصدر الأدق قبل إضافة المنتج إلى السلة.",
  },
];

export default function CarAirFreshenersPage() {
  const pageUrl = absoluteUrl("/car-air-fresheners");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "معطرات سيارات",
      url: pageUrl,
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: scentTypes.map((item) => item.title),
      description:
        "دليل لاختيار معطرات السيارات وفهم أنواع الروائح وطرق الاستخدام المتاحة في Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">معطرات سيارات</h1>
          <p className="leading-8 text-slate-600">
            معطر السيارة يساعد على جعل القيادة اليومية أكثر راحة، لكن الاختيار المناسب
            يعتمد على الرائحة، طريقة الاستخدام، حجم السيارة، ودرجة قوة الرائحة التي
            تفضلها. في متجر سيزر يمكنك تصفح المعطرات المتاحة واختيار الأنسب قبل الطلب.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أنواع معطرات السيارات</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {scentTypes.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">كيف تختار معطر السيارة؟</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {choosingTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح المعطرات والمنتجات المتاحة</h2>
          <p className="leading-8 text-slate-600">
            صفحات المنتجات هي المصدر الأدق للسعر، حالة التوفر، الصور، وأي اختيارات
            مثل الرائحة أو الحجم أو المواصفة. استخدم صفحة المتجر أو الأقسام للوصول إلى
            المنتجات الحالية.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/categories">
              تصفح الأقسام
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/car-care">
              منتجات العناية بالسيارات
            </Link>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن معطرات السيارات</h2>
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
