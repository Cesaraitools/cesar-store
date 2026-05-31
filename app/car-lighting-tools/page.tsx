import type { Metadata } from "next";
import Link from "next/link";

import { InternalSearchLinks } from "@/components/InternalSearchLinks";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "أدوات وإضاءة سيارات",
  description:
    "دليل اختيار أدوات وإضاءة السيارات من متجر سيزر، مع نصائح لمراجعة المواصفات والاستخدام قبل الطلب داخل مصر.",
  alternates: {
    canonical: "/car-lighting-tools",
  },
  openGraph: {
    title: "أدوات وإضاءة سيارات | Cesar Store",
    description:
      "تعرف على أدوات وإضاءة السيارات وكيف تختار المنتج المناسب من متجر سيزر.",
    url: absoluteUrl("/car-lighting-tools"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const toolTypes = [
  {
    title: "منتجات إضاءة",
    text: "منتجات مرتبطة بالإضاءة أو تحسين الرؤية أو الاستخدام العملي، ويجب مراجعة المواصفات قبل الشراء.",
  },
  {
    title: "أدوات مساعدة",
    text: "أدوات تسهل بعض الاستخدامات اليومية أو أعمال العناية البسيطة بالسيارة.",
  },
  {
    title: "منتجات للطوارئ أو الاستخدام السريع",
    text: "اختيارات قد تكون مفيدة في مواقف محددة، مع ضرورة فهم طريقة الاستخدام من صفحة المنتج.",
  },
  {
    title: "ملحقات تشغيل أو تركيب",
    text: "منتجات قد تحتاج مراجعة المقاس أو طريقة التثبيت أو التوافق حسب الوصف والصور.",
  },
];

const tips = [
  "راجع المواصفات والصور جيدا قبل شراء أي منتج إضاءة أو أداة.",
  "تأكد من أن المنتج مناسب لطريقة الاستخدام التي تحتاجها.",
  "لو المنتج له مقاس أو نوع أو لون، اختر الاختيار الصحيح من صفحة المنتج.",
  "لا تعتمد على اسم المنتج فقط؛ اقرأ الوصف وحالة التوفر والسعر.",
  "تواصل مع المتجر لو احتجت تأكيد قبل الطلب.",
];

const faqs = [
  {
    question: "كيف أختار منتج إضاءة مناسب للسيارة؟",
    answer:
      "راجع وصف المنتج والصور والمواصفات المتاحة، وتأكد من أن المنتج مناسب للاستخدام المطلوب قبل الطلب.",
  },
  {
    question: "هل أدوات السيارات تحتاج مقاسا أو مواصفة معينة؟",
    answer:
      "بعض الأدوات والملحقات قد تعتمد على المقاس أو طريقة الاستخدام، لذلك يجب مراجعة صفحة المنتج بدقة.",
  },
  {
    question: "هل صفحة المنتج توضح حالة التوفر؟",
    answer:
      "نعم، صفحة المنتج في متجر سيزر توضح السعر وحالة التوفر والاختيارات المتاحة عند وجودها.",
  },
  {
    question: "هل يمكن طلب مساعدة لاختيار أداة أو منتج إضاءة؟",
    answer:
      "نعم، يمكن التواصل مع متجر سيزر عبر وسائل التواصل المتاحة في الموقع قبل إتمام الطلب.",
  },
];

export default function CarLightingToolsPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "أدوات وإضاءة سيارات",
      url: absoluteUrl("/car-lighting-tools"),
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: toolTypes.map((item) => item.title),
      description: "دليل لاختيار أدوات وإضاءة السيارات ومراجعة المواصفات من Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">أدوات وإضاءة سيارات</h1>
          <p className="leading-8 text-slate-600">
            أدوات وإضاءة السيارات تحتاج اختيارا دقيقا حسب الاستخدام والمواصفات. هذه
            الصفحة تساعدك على فهم الأنواع العامة، ثم الرجوع إلى صفحة المنتج لمعرفة
            التفاصيل الدقيقة قبل الطلب.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أنواع الأدوات والإضاءة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {toolTypes.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">نصائح قبل الشراء</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح الأدوات والإضاءة</h2>
          <p className="leading-8 text-slate-600">
            استخدم صفحة المنتج لمعرفة المواصفات الفعلية والسعر وحالة التوفر، ولا
            تعتمد على التصنيف العام فقط.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/categories">
              تصفح الأقسام
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/faq">
              الأسئلة الشائعة
            </Link>
          </div>
        </section>

        <InternalSearchLinks
          title="ابحث عن إضاءة السيارة"
          description="هذه الروابط توجه إلى نتائج بحث داخلية لكلمات الإضاءة والمقاسات الشائعة في منتجات السيارات."
          links={[
            { label: "ليد سيارة" },
            { label: "طقم ليد سيارة" },
            { label: "طقم ليد تيسلا" },
            { label: "لمبات ليد سيارة" },
            { label: "ليد H7" },
            { label: "ليد H8" },
            { label: "ليد H11" },
          ]}
        />

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن الأدوات والإضاءة</h2>
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
