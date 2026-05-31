import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_WHATSAPP_URL, DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "دليل الطلب من متجر سيزر",
  description:
    "خطوات الطلب من متجر سيزر Cesar Store: تصفح منتجات السيارات، اختيار المقاس أو اللون، الإضافة للسلة، إدخال البيانات، ومتابعة الطلب داخل مصر.",
  alternates: {
    canonical: "/ordering-guide",
  },
  openGraph: {
    title: "دليل الطلب من متجر سيزر | Cesar Store",
    description:
      "تعرف على طريقة اختيار منتجات السيارات وإضافتها للسلة وإكمال الطلب والتواصل مع متجر سيزر.",
    url: absoluteUrl("/ordering-guide"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const steps = [
  {
    title: "تصفح المنتجات أو الأقسام",
    text: "ابدأ من صفحة المتجر أو صفحة الأقسام لاختيار نوع المنتج: عناية وتنظيف، معطرات، إكسسوارات، أدوات، إضاءة، أو سوائل وإضافات.",
  },
  {
    title: "افتح صفحة المنتج",
    text: "راجع الصور والوصف والسعر وحالة التوفر. إذا كان المنتج له مقاس أو لون أو اختيار مختلف، اختر المواصفة المناسبة قبل الإضافة للسلة.",
  },
  {
    title: "أضف المنتج إلى السلة",
    text: "بعد اختيار المواصفة الصحيحة، أضف المنتج للسلة. يمكن إضافة نفس المنتج باختيار مختلف إذا كان الاختلاف متاحًا داخل صفحة المنتج.",
  },
  {
    title: "راجع السلة",
    text: "تأكد من الكمية والاختيارات قبل إكمال الطلب، خصوصًا المنتجات التي تختلف بالمقاس أو اللون أو الرائحة أو القدرة.",
  },
  {
    title: "أكمل بيانات الطلب",
    text: "أدخل بيانات التواصل والعنوان بدقة حتى يتم التواصل أو الشحن بشكل صحيح. راجع رقم الهاتف قبل تأكيد الطلب.",
  },
  {
    title: "تابع الطلب عند الحاجة",
    text: "يمكنك التواصل عبر واتساب للاستفسار عن الطلب أو تأكيد بياناته أو السؤال عن منتج قبل الشراء.",
  },
];

const faqs = [
  {
    question: "هل يجب اختيار المقاس أو اللون قبل إضافة المنتج للسلة؟",
    answer:
      "نعم، إذا كان المنتج يحتوي على اختيارات مثل المقاس أو اللون أو الرائحة أو القدرة، يجب اختيار المواصفة المناسبة قبل الإضافة للسلة.",
  },
  {
    question: "هل يمكن إضافة نفس المنتج بأكثر من اختيار؟",
    answer:
      "نعم، يمكن إضافة نفس المنتج بأكثر من اختيار مختلف عندما تكون الاختيارات متاحة في صفحة المنتج، مثل مقاسين أو لونين مختلفين.",
  },
  {
    question: "ماذا أفعل إذا لم أكن متأكدًا من المنتج المناسب؟",
    answer:
      "يمكنك التواصل مع متجر سيزر عبر واتساب قبل الطلب لتأكيد المقاس أو نوع الاستخدام أو المنتج الأنسب لاحتياجك.",
  },
];

export default function OrderingGuidePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "دليل الطلب من متجر سيزر",
      url: absoluteUrl("/ordering-guide"),
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
          <h1 className="text-3xl font-bold text-slate-950">دليل الطلب من متجر سيزر</h1>
          <p className="leading-8 text-slate-600">
            يوضح هذا الدليل طريقة الطلب من متجر سيزر خطوة بخطوة، بداية من تصفح منتجات
            السيارات واختيار المواصفات المناسبة، وحتى مراجعة السلة وإكمال بيانات الطلب.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">خطوات الطلب</h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-md border border-slate-100 p-5">
                <p className="text-sm font-bold text-blue-700">خطوة {index + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 leading-8 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">نصائح قبل تأكيد الطلب</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            <li>راجع اسم المنتج والمقاس أو اللون أو الرائحة إذا كانت موجودة.</li>
            <li>تأكد من رقم الهاتف والعنوان قبل تأكيد الطلب.</li>
            <li>استخدم صفحة المنتج لمعرفة الوصف والاستخدام المناسب قبل الشراء.</li>
            <li>تواصل عبر واتساب إذا كان المنتج يحتاج تأكيد توافق أو مقاس.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أسئلة شائعة عن الطلب</h2>
          {faqs.map((faq) => (
            <article key={faq.question} className="border-b border-slate-100 pb-4 last:border-0">
              <h3 className="font-bold text-slate-950">{faq.question}</h3>
              <p className="mt-2 leading-8 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
            ابدأ التسوق
          </Link>
          <a className="rounded-md bg-emerald-50 px-4 py-2 text-emerald-700" href={CONTACT_WHATSAPP_URL}>
            التواصل عبر واتساب
          </a>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/shipping">
            معلومات الشحن
          </Link>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/faq">
            الأسئلة الشائعة
          </Link>
        </div>
      </section>
    </main>
  );
}
