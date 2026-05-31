import type { Metadata } from "next";
import Link from "next/link";

import { InternalSearchLinks } from "@/components/InternalSearchLinks";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "سوائل وإضافات سيارات",
  description:
    "دليل سوائل وإضافات السيارات من متجر سيزر، يشمل موتور فلاش، منظف رشاشات، رافع أوكتان، ومياه مساحات مع تنبيهات الاستخدام.",
  alternates: {
    canonical: "/car-fluids-additives",
  },
  openGraph: {
    title: "سوائل وإضافات سيارات | Cesar Store",
    description:
      "تعرف على سوائل وإضافات السيارات المتاحة في متجر سيزر وكيف تختار المنتج المناسب بأمان.",
    url: absoluteUrl("/car-fluids-additives"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const fluidGroups = [
  {
    title: "موتور فلاش",
    text: "منتجات مخصصة لتنظيف داخلي معين حسب تعليمات المنتج، ويجب استخدامها فقط بالطريقة الموضحة وبما يناسب حالة السيارة.",
  },
  {
    title: "منظف رشاشات",
    text: "منتجات موجهة للعناية بمنظومة الوقود أو الرشاشات حسب وصف المنتج، ولا تستخدم كبديل عن الصيانة عند وجود عطل واضح.",
  },
  {
    title: "رافع أوكتان وإضافات وقود",
    text: "إضافات تستخدم حسب نوع الوقود وتعليمات المنتج، مع ضرورة الالتزام بالجرعة وطريقة الاستخدام الموصى بها.",
  },
  {
    title: "مياه مساحات",
    text: "منتجات تساعد في تنظيف الزجاج الأمامي مع المساحات، وتتوفر بأحجام مختلفة مثل 500 ملي و1 لتر حسب المتاح.",
  },
];

const availableExamples = [
  "موتور فلاش موتور ميدك - سايكلو",
  "منظف رشاشات موتور ميديك - سايكلو 354 ملي",
  "رافع أوكتان - سايكلو 237 ملي",
  "مياه مساحات ويكسو 4 إكس - 500 ملي",
  "مياه مساحات ويكسو 4 إكس - 1 لتر",
  "ماكس 44 - 473 ملي",
];

const tips = [
  "راجع وصف المنتج وحجمه وطريقة الاستخدام قبل الشراء.",
  "اتبع تعليمات المنتج ودليل السيارة، خصوصا مع إضافات الوقود أو منتجات المحرك.",
  "لا تخلط منتجات كيميائية أو إضافات مختلفة بدون تعليمات واضحة من الشركة المصنعة.",
  "استخدم مياه المساحات للزجاج الأمامي فقط حسب الغرض المخصص لها.",
  "لو السيارة بها عطل واضح، لا تعتمد على الإضافات كبديل عن فحص فني.",
];

const faqs = [
  {
    question: "ما الفرق بين السوائل والإضافات في السيارة؟",
    answer:
      "السوائل مثل مياه المساحات تستخدم لغرض مباشر، بينما الإضافات مثل منظف الرشاشات أو رافع الأوكتان تستخدم حسب تعليمات المنتج ونوع السيارة أو الوقود.",
  },
  {
    question: "هل يمكن استخدام إضافات الوقود في أي سيارة؟",
    answer:
      "يجب مراجعة تعليمات المنتج ودليل السيارة قبل الاستخدام، لأن ملاءمة الإضافة تعتمد على نوع الوقود وحالة السيارة وطريقة الاستخدام.",
  },
  {
    question: "هل موتور فلاش مناسب لكل المحركات؟",
    answer:
      "لا يجب افتراض ذلك. يجب قراءة تعليمات المنتج ومراعاة حالة المحرك، ويفضل استشارة فني عند الشك.",
  },
  {
    question: "أين أجد الحجم والسعر وحالة التوفر؟",
    answer:
      "صفحة المنتج في متجر سيزر هي المصدر الأدق للحجم والسعر والصور وحالة التوفر قبل الطلب.",
  },
];

export default function CarFluidsAdditivesPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "سوائل وإضافات سيارات",
      url: absoluteUrl("/car-fluids-additives"),
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: fluidGroups.map((item) => item.title),
      description:
        "دليل لاختيار سوائل وإضافات السيارات مثل موتور فلاش ومنظف الرشاشات ورافع الأوكتان ومياه المساحات من Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">سوائل وإضافات سيارات</h1>
          <p className="leading-8 text-slate-600">
            سوائل وإضافات السيارات تحتاج اختيارا حذرا لأنها مرتبطة بالاستخدام الفني
            للسيارة. في متجر سيزر يظهر هذا القسم بمنتجات مثل موتور فلاش، منظف
            رشاشات، رافع أوكتان، ومياه مساحات بأحجام مختلفة.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">ماذا يشمل هذا القسم؟</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {fluidGroups.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أمثلة من المنتجات المتاحة</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {availableExamples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تنبيهات مهمة قبل الاستخدام</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح السوائل والإضافات</h2>
          <p className="leading-8 text-slate-600">
            صفحة المنتج هي المرجع الأساسي للحجم والسعر وحالة التوفر، وأي تعليمات
            مذكورة في وصف المنتج.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/car-cleaning-products">
              منتجات تنظيف السيارات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/faq">
              الأسئلة الشائعة
            </Link>
          </div>
        </section>

        <InternalSearchLinks
          title="ابحث عن سوائل وإضافات السيارة"
          description="روابط داخلية لأهم كلمات البحث المرتبطة بمياه المساحات ومنظف الرشاشات ورافع الأوكتان ومنتجات المحرك."
          links={[
            { label: "مياه مساحات" },
            { label: "مياه مساحات سيارة" },
            { label: "منظف رشاشات" },
            { label: "منظف رشاشات بنزين" },
            { label: "رافع اوكتان" },
            { label: "رافع أوكتان" },
            { label: "موتور فلاش" },
            { label: "منظف دورة زيت المحرك" },
          ]}
        />

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن السوائل والإضافات</h2>
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
