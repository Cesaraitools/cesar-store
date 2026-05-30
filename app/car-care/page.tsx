import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "منتجات العناية بالسيارات",
  description:
    "دليل مختصر لاختيار منتجات العناية بالسيارات من متجر سيزر، مع نصائح للتنظيف، الحماية، المعطرات، والإكسسوارات المناسبة داخل مصر.",
  alternates: {
    canonical: "/car-care",
  },
  openGraph: {
    title: "منتجات العناية بالسيارات | Cesar Store",
    description:
      "تعرف على منتجات العناية بالسيارات وكيف تختار المنتج المناسب من متجر سيزر.",
    url: absoluteUrl("/car-care"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const productTypes = [
  {
    title: "منتجات التنظيف",
    text: "تساعد على إزالة الأتربة والبقع والحفاظ على مظهر السيارة من الداخل والخارج حسب نوع المنتج وطريقة استخدامه.",
  },
  {
    title: "معطرات السيارات",
    text: "مناسبة لتحسين رائحة السيارة اليومية، وتختلف حسب الرائحة، الحجم، وطريقة التثبيت أو الاستخدام.",
  },
  {
    title: "الإكسسوارات العملية",
    text: "تشمل منتجات تساعد في تنظيم السيارة أو تحسين تجربة الاستخدام اليومي حسب احتياج العميل.",
  },
  {
    title: "الأدوات والإضاءة",
    text: "منتجات مساعدة للاستخدام داخل السيارة أو حولها، ويجب اختيارها حسب الاستخدام المطلوب ومواصفات المنتج.",
  },
];

const buyingTips = [
  "حدد هل احتياجك للتنظيف، التعطير، التنظيم، الإضاءة، أو الاستخدام اليومي.",
  "راجع اسم المنتج والصور والوصف قبل الشراء.",
  "لو المنتج له مقاس أو لون أو اختيار مختلف، اختر الاختيار الصحيح قبل إضافته للسلة.",
  "تأكد من حالة التوفر والسعر الحالي داخل صفحة المنتج.",
  "لو محتار بين أكثر من منتج، تواصل مع المتجر قبل إتمام الطلب.",
];

const faqs = [
  {
    question: "ما أفضل طريقة لاختيار منتج عناية للسيارة؟",
    answer:
      "ابدأ بتحديد المشكلة أو الهدف: تنظيف، تعطير، تنظيم، إضاءة، أو إكسسوار عملي، ثم راجع وصف المنتج وحالة التوفر والسعر قبل الطلب.",
  },
  {
    question: "هل منتجات العناية بالسيارات مناسبة لكل السيارات؟",
    answer:
      "بعض المنتجات عامة ومناسبة لمعظم السيارات، وبعضها يعتمد على المقاس أو الاستخدام أو مكان التركيب، لذلك يجب مراجعة صفحة المنتج قبل الشراء.",
  },
  {
    question: "هل تظهر اختيارات المقاس أو اللون في صفحة المنتج؟",
    answer:
      "نعم، المنتجات التي تحتوي على اختيارات مثل المقاس أو اللون أو المواصفة تعرض هذه الاختيارات داخل صفحة المنتج قبل الإضافة إلى السلة.",
  },
  {
    question: "هل يمكن طلب المساعدة قبل شراء منتج عناية للسيارة؟",
    answer:
      "نعم، يمكن التواصل مع متجر سيزر عبر واتساب أو وسائل التواصل المتاحة في الموقع للمساعدة في اختيار المنتج المناسب.",
  },
];

export default function CarCarePage() {
  const pageUrl = absoluteUrl("/car-care");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "منتجات العناية بالسيارات",
      url: pageUrl,
      inLanguage: "ar-EG",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
      about: productTypes.map((item) => item.title),
      description:
        "دليل لاختيار منتجات العناية بالسيارات ومعرفة أنواع المنتجات المتاحة في Cesar Store.",
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
          <h1 className="text-3xl font-bold text-slate-950">منتجات العناية بالسيارات</h1>
          <p className="leading-8 text-slate-600">
            العناية بالسيارة لا تعني منتجا واحدا فقط، بل مجموعة اختيارات تساعدك على
            تنظيف السيارة، تحسين رائحتها، تنظيم الاستخدام اليومي، أو إضافة إكسسوارات
            عملية. في متجر سيزر يمكنك تصفح المنتجات المتاحة واختيار الأنسب حسب الحاجة.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أنواع منتجات العناية بالسيارات</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {productTypes.map((item) => (
              <article key={item.title} className="rounded-md border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">كيف تختار المنتج المناسب؟</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {buyingTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">ابدأ من هنا</h2>
          <p className="leading-8 text-slate-600">
            لو كنت تبحث عن منتج محدد، افتح صفحة المتجر أو الأقسام وشاهد المنتجات
            الحالية والأسعار وحالة التوفر. صفحات المنتجات هي المصدر الأدق لأي سعر أو
            اختيار أو توفر.
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

        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن العناية بالسيارات</h2>
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
