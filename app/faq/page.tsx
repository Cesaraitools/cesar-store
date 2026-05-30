import type { Metadata } from "next";

import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "إجابات واضحة عن متجر سيزر، المنتجات، الطلب، الشحن، الدفع، الاستبدال، وطريقة التواصل داخل مصر.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "الأسئلة الشائعة | Cesar Store",
    description:
      "تعرف على أهم الأسئلة عن منتجات متجر سيزر للسيارات وطريقة الطلب والتواصل والاستبدال.",
    url: absoluteUrl("/faq"),
    siteName: SITE_NAME,
    type: "website",
  },
};

const faqs = [
  {
    question: "ما هو متجر سيزر؟",
    answer:
      "متجر سيزر هو متجر إلكتروني مصري لمنتجات وإكسسوارات السيارات، ويعرض منتجات للعناية بالسيارة، المعطرات، المنظفات، الأدوات، الإضاءة، وبعض الإكسسوارات المختارة.",
  },
  {
    question: "ما أنواع المنتجات المتاحة في Cesar Store؟",
    answer:
      "يوفر المتجر منتجات عناية وتنظيف للسيارات، معطرات، إكسسوارات، أدوات، منتجات إضاءة، ومنتجات أخرى مرتبطة باستخدام السيارة اليومي.",
  },
  {
    question: "كيف أبحث عن منتج مناسب؟",
    answer:
      "يمكنك تصفح صفحة المتجر أو الأقسام، أو استخدام اسم المنتج أو نوعه مثل معطر، منظف، إضاءة، إكسسوار، أو أداة للوصول إلى المنتجات المتاحة.",
  },
  {
    question: "هل أسعار المنتجات بالجنيه المصري؟",
    answer:
      "نعم، أسعار المنتجات في متجر سيزر معروضة بالجنيه المصري EGP، وقد تختلف حسب المقاس أو اللون أو الاختيار المتاح للمنتج.",
  },
  {
    question: "هل المنتجات التي لها مقاسات أو ألوان تظهر كاختيارات؟",
    answer:
      "نعم، المنتجات التي لها مقاسات أو ألوان أو مواصفات مختلفة تظهر داخل صفحة المنتج كاختيارات، ويتم حفظ الاختيار الصحيح في السلة والطلب.",
  },
  {
    question: "كيف أعرف أن المنتج متوفر؟",
    answer:
      "صفحة المنتج توضح حالة التوفر، ويتم ربط الطلب بالمخزون الصحيح، بما في ذلك الاختيارات المختلفة مثل المقاس أو اللون عند توفرها.",
  },
  {
    question: "كيف أطلب من متجر سيزر؟",
    answer:
      "افتح صفحة المنتج، اختر المواصفات المناسبة إن وجدت، أضف المنتج إلى السلة، ثم أكمل بيانات الطلب من صفحة الدفع.",
  },
  {
    question: "كيف أتواصل مع متجر سيزر قبل أو بعد الطلب؟",
    answer: `يمكنك التواصل مع متجر سيزر عبر الهاتف ${CONTACT_PHONE_DISPLAY} أو واتساب أو البريد الإلكتروني ${CONTACT_EMAIL}.`,
  },
  {
    question: "هل يمكن استبدال أو إرجاع المنتج؟",
    answer:
      "يمكن طلب الاستبدال أو الإرجاع وفق سياسة الإرجاع والاستبدال المنشورة في الموقع، مع مراعاة حالة المنتج ومدة الطلب وسبب الإرجاع.",
  },
  {
    question: "هل يتم تحديث المنتجات تلقائيا في Google Merchant Center؟",
    answer:
      "نعم، يتم تحديث منتجات Merchant Center من ملف المنتجات الخاص بالموقع، ولا يتم تعديل المنتجات يدويا داخل Merchant Center.",
  },
];

export default function FAQPage() {
  const faqStructuredData = {
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
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="space-y-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">الأسئلة الشائعة</h1>
          <p className="leading-8 text-slate-600">
            إجابات مختصرة عن متجر سيزر والمنتجات وطريقة الطلب والتواصل، لتسهيل تجربة
            العميل ومساعدة محركات البحث ومحركات الإجابة على فهم معلومات المتجر بدقة.
          </p>
        </div>

        <div className="space-y-5">
          {faqs.map((faq) => (
            <section key={faq.question} className="border-b border-slate-100 pb-5 last:border-0">
              <h2 className="text-lg font-bold text-slate-950">{faq.question}</h2>
              <p className="mt-2 leading-8 text-slate-600">{faq.answer}</p>
            </section>
          ))}
        </div>

        <div className="rounded-md bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          للتواصل السريع:
          <a className="mx-1 font-semibold text-blue-700" href={CONTACT_WHATSAPP_URL}>
            واتساب
          </a>
          أو البريد الإلكتروني
          <span className="mx-1 font-semibold" dir="ltr">
            {CONTACT_EMAIL}
          </span>
        </div>
      </section>
    </main>
  );
}
