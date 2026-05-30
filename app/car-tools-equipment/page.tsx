import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "أدوات ومعدات سيارات",
  description:
    "دليل اختيار أدوات ومعدات السيارات من متجر سيزر، يشمل كمبريسور هواء، كابلات بطارية، ووايرات جر مع نصائح استخدام آمنة.",
  alternates: {
    canonical: "/car-tools-equipment",
  },
  openGraph: {
    title: "أدوات ومعدات سيارات | Cesar Store",
    description:
      "تعرف على أدوات ومعدات السيارات المتاحة في متجر سيزر وكيف تختار المنتج المناسب للاستخدام اليومي والطوارئ.",
    url: absoluteUrl("/car-tools-equipment"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const productGroups = [
  {
    title: "كمبريسور هواء للسيارة",
    text: "القسم يحتوي على كمبريسورات هواء مثل كمبريسور 2 بستم وكمبريسور ديجيتال بالمرفقات، وهي منتجات تساعد في التعامل مع ضغط الإطارات عند الحاجة مع مراجعة ضغط السيارة الموصى به.",
  },
  {
    title: "كابلات بطارية",
    text: "توجد كابلات بطارية بقدرات مختلفة مثل 400 أمبير و800 أمبير، وهي من أدوات الطوارئ التي يجب استخدامها بحذر ووفق تعليمات السيارة والمنتج.",
  },
  {
    title: "وايرات جر",
    text: "القسم يتضمن وايرات جر بأطوال ومقاسات مختلفة مثل 4 متر و5 متر، ويجب اختيارها حسب الاستخدام ومراجعة نقاط التثبيت الآمنة.",
  },
  {
    title: "معدات للطوارئ والاستخدام العملي",
    text: "هذه المنتجات لا تغني عن الصيانة الدورية، لكنها تساعد في مواقف محددة مثل انخفاض ضغط الإطار أو الحاجة للمساعدة على الطريق.",
  },
];

const availableExamples = [
  "كمبريسور انكو 2 بستم",
  "كمبروسر ديجيتال سيزر بالمرفقات 2 بستم",
  "كابل بطارية 400 أمبير",
  "كابل بطارية 800 أمبير",
  "واير جر تي آر إكس 4 متر",
  "واير جر 12 ملي 5 متر",
];

const tips = [
  "راجع صفحة المنتج لمعرفة المواصفات والسعر وحالة التوفر قبل الطلب.",
  "عند ضبط ضغط الإطارات، استخدم ضغط السيارة الموصى به في دليل السيارة أو ملصق باب السائق.",
  "كابلات البطارية ووايرات الجر أدوات طوارئ، ويجب استخدامها بطريقة صحيحة وآمنة.",
  "لا تستخدم واير جر أو كابل بطارية خارج الغرض أو القدرة المناسبة له.",
  "لو لم تكن متأكدا من الاستخدام، تواصل مع المتجر أو فني مختص قبل التجربة.",
];

const faqs = [
  {
    question: "ما المنتجات الموجودة في قسم الأدوات والمعدات؟",
    answer:
      "القسم يشمل منتجات مثل كمبريسور هواء للسيارة، كابلات بطارية، ووايرات جر بأطوال أو قدرات مختلفة حسب المتاح في المتجر.",
  },
  {
    question: "هل كمبريسور السيارة يغني عن فحص ضغط الإطارات؟",
    answer:
      "لا. الكمبريسور يساعد على ضبط الضغط عند الحاجة، لكن يجب معرفة الضغط الصحيح من دليل السيارة أو ملصق باب السائق وفحص الإطارات بانتظام.",
  },
  {
    question: "هل كابلات البطارية مناسبة لكل السيارات؟",
    answer:
      "يجب مراجعة قدرة الكابل وتعليمات السيارة والمنتج قبل الاستخدام، لأن طريقة التشغيل الآمن تختلف حسب حالة السيارة والبطارية.",
  },
  {
    question: "كيف أختار واير الجر المناسب؟",
    answer:
      "راجع طول الواير ومقاسه ووصف المنتج، ولا تستخدمه إلا مع نقاط تثبيت آمنة وبطريقة مناسبة للحالة.",
  },
];

export default function CarToolsEquipmentPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "أدوات ومعدات سيارات",
      url: absoluteUrl("/car-tools-equipment"),
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: productGroups.map((item) => item.title),
      description:
        "دليل لاختيار أدوات ومعدات السيارات مثل كمبريسور الهواء وكابلات البطارية ووايرات الجر من Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">أدوات ومعدات سيارات</h1>
          <p className="leading-8 text-slate-600">
            أدوات ومعدات السيارة تساعدك في مواقف عملية مثل متابعة ضغط الإطارات أو
            التعامل مع مواقف الطوارئ. في متجر سيزر تظهر المنتجات المتاحة في هذا
            القسم مثل الكمبريسورات وكابلات البطارية ووايرات الجر.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">ماذا يشمل هذا القسم؟</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {productGroups.map((item) => (
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
          <h2 className="text-xl font-bold text-slate-950">نصائح قبل الشراء أو الاستخدام</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">تصفح الأدوات والمعدات</h2>
          <p className="leading-8 text-slate-600">
            صفحة المنتج هي المرجع الأساسي للسعر، الصور، حالة التوفر، وأي مواصفات
            تفصيلية.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/categories">
              تصفح الأقسام
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/car-lighting-tools">
              إضاءة السيارات
            </Link>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن أدوات ومعدات السيارات</h2>
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
