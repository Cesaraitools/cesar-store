import type { Metadata } from "next";
import Link from "next/link";

import { InternalSearchLinks } from "@/components/InternalSearchLinks";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "إكسسوارات سيارات",
  description:
    "دليل اختيار إكسسوارات السيارات من متجر سيزر، مع توضيح الإكسسوارات العملية والتنظيمية ونصائح الشراء داخل مصر.",
  alternates: {
    canonical: "/car-accessories",
  },
  openGraph: {
    title: "إكسسوارات سيارات | Cesar Store",
    description:
      "تعرف على أنواع إكسسوارات السيارات وكيف تختار المنتج المناسب من متجر سيزر.",
    url: absoluteUrl("/car-accessories"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const accessoryTypes = [
  {
    title: "إكسسوارات تنظيم السيارة",
    text: "منتجات تساعد على ترتيب الاستخدام اليومي وتقليل الفوضى داخل السيارة.",
  },
  {
    title: "إكسسوارات الراحة",
    text: "اختيارات عملية لتحسين تجربة القيادة أو الجلوس أو الاستخدام المتكرر للسيارة.",
  },
  {
    title: "إكسسوارات حماية وعناية",
    text: "منتجات تساعد في الحفاظ على بعض أجزاء السيارة أو تسهيل العناية بها حسب الاستخدام.",
  },
  {
    title: "إكسسوارات شكلية وعملية",
    text: "منتجات تضيف لمسة استخدام أو مظهر، مع ضرورة مراجعة المقاس والمواصفات قبل الشراء.",
  },
];

const tips = [
  "حدد هل تريد إكسسوارا للتنظيم، الراحة، الحماية، أو الشكل.",
  "راجع المقاس أو طريقة التركيب إن كانت مهمة للمنتج.",
  "تأكد من الصور والوصف قبل إضافة المنتج للسلة.",
  "لو المنتج له لون أو مقاس، اختر الاختيار الصحيح من صفحة المنتج.",
  "اسأل المتجر قبل الطلب إذا كنت غير متأكد من ملاءمة المنتج.",
];

const faqs = [
  {
    question: "ما هي إكسسوارات السيارات؟",
    answer:
      "إكسسوارات السيارات هي منتجات إضافية تساعد على تحسين الاستخدام، التنظيم، الراحة، أو المظهر داخل السيارة أو حولها.",
  },
  {
    question: "كيف أختار إكسسوار مناسب لسيارتي؟",
    answer:
      "راجع وظيفة المنتج، المقاس، الصور، وطريقة الاستخدام، وتأكد من أنه مناسب لاحتياجك قبل الطلب.",
  },
  {
    question: "هل كل الإكسسوارات تناسب كل السيارات؟",
    answer:
      "ليست كل الإكسسوارات عامة. بعض المنتجات تعتمد على المقاس أو طريقة التركيب أو الاستخدام، لذلك يجب مراجعة صفحة المنتج.",
  },
  {
    question: "هل يمكن إضافة نفس المنتج باختيارات مختلفة؟",
    answer:
      "نعم، إذا كان المنتج يدعم اختيارات مختلفة مثل المقاس أو اللون، يمكن إضافة نفس المنتج باختيار مختلف حسب المتاح.",
  },
];

export default function CarAccessoriesPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "إكسسوارات سيارات",
      url: absoluteUrl("/car-accessories"),
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: accessoryTypes.map((item) => item.title),
      description: "دليل لاختيار إكسسوارات السيارات العملية والتنظيمية من Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">إكسسوارات سيارات</h1>
          <p className="leading-8 text-slate-600">
            إكسسوارات السيارات تساعد في جعل الاستخدام اليومي أكثر راحة وتنظيما. في
            متجر سيزر يمكنك تصفح الإكسسوارات المتاحة واختيار المنتج المناسب حسب
            الوظيفة والمقاس وطريقة الاستخدام.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أنواع إكسسوارات السيارات</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {accessoryTypes.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">نصائح اختيار الإكسسوارات</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح الإكسسوارات</h2>
          <p className="leading-8 text-slate-600">
            صفحة المنتج هي المصدر الأدق لمعرفة السعر، التوفر، الصور، والاختيارات
            المتاحة.
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
          title="روابط بحث للإكسسوارات الأكثر طلبا"
          description="استخدم هذه الروابط للانتقال إلى نتائج بحث داخلية لمنتجات الإكسسوارات والمساحات والراحة والتنظيم."
          links={[
            { label: "مساحات سيارة" },
            { label: "مساحات سيزر" },
            { label: "مساحات عظم" },
            { label: "رقبة سفر للسيارة" },
            { label: "مخدة رقبة سيارة" },
            { label: "باسكت قمامة سيارة" },
            { label: "ماكت سيارة" },
            { label: "مجسم سيارة" },
          ]}
        />

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن إكسسوارات السيارات</h2>
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
