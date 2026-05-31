import type { Metadata } from "next";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_E164,
  CONTACT_WHATSAPP_URL,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_NAME_AR,
  SITE_URL,
  SOCIAL_LINKS,
  absoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "التواصل مع متجر سيزر",
  description:
    "طرق التواصل الرسمية مع متجر سيزر Cesar Store للاستفسار عن منتجات السيارات والطلبات والشحن داخل مصر عبر الهاتف أو واتساب أو البريد الإلكتروني.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "التواصل مع متجر سيزر | Cesar Store",
    description:
      "تواصل مع متجر سيزر للاستفسار عن منتجات العناية بالسيارات والإكسسوارات والطلبات والشحن داخل مصر.",
    url: absoluteUrl("/contact"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const contactMethods = [
  {
    title: "واتساب",
    value: CONTACT_PHONE_DISPLAY,
    href: CONTACT_WHATSAPP_URL,
    note: "الأفضل للاستفسارات السريعة عن المنتجات، المقاسات، التوفر، ومتابعة الطلب.",
  },
  {
    title: "الهاتف",
    value: CONTACT_PHONE_DISPLAY,
    href: `tel:${CONTACT_PHONE_E164}`,
    note: "للاستفسار المباشر عن الطلبات أو المنتجات المتاحة في متجر سيزر.",
  },
  {
    title: "البريد الإلكتروني",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    note: "مناسب للرسائل التفصيلية أو إرسال بيانات طلب أو صور توضيحية عند الحاجة.",
  },
];

const faqs = [
  {
    question: "ما هي طريقة التواصل الأسرع مع متجر سيزر؟",
    answer:
      "واتساب هو أسرع وسيلة للتواصل مع متجر سيزر عند السؤال عن منتج، مقاس، لون، توفر، أو متابعة طلب.",
  },
  {
    question: "هل يمكن الاستفسار عن منتج قبل الطلب؟",
    answer:
      "نعم، يمكن التواصل قبل الطلب لتأكيد التوفر أو اختيار المنتج المناسب من منتجات العناية بالسيارات أو الإكسسوارات أو الأدوات.",
  },
  {
    question: "ما البيانات المفيدة عند متابعة طلب؟",
    answer:
      "يفضل إرسال رقم الطلب إن وجد، واسم العميل، ورقم الهاتف المستخدم في الطلب، واسم المنتج المطلوب الاستفسار عنه.",
  },
];

export default function ContactPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "التواصل مع متجر سيزر",
      url: absoluteUrl("/contact"),
      inLanguage: "ar-EG",
      about: {
        "@type": "AutoPartsStore",
        name: SITE_NAME,
        alternateName: [SITE_NAME_AR, "Cesar Shop", "سيزر ستور", "سيزر شوب"],
        url: SITE_URL,
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_E164,
        sameAs: SOCIAL_LINKS,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: CONTACT_PHONE_E164,
          email: CONTACT_EMAIL,
          contactType: "customer support",
          areaServed: "EG",
          availableLanguage: ["ar", "en"],
        },
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
          <h1 className="text-3xl font-bold text-slate-950">التواصل مع متجر سيزر</h1>
          <p className="leading-8 text-slate-600">
            هذه الصفحة تجمع طرق التواصل الرسمية مع متجر سيزر للاستفسار عن منتجات السيارات،
            متابعة الطلبات، تأكيد التوفر، أو طلب مساعدة في اختيار منتج مناسب داخل مصر.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {contactMethods.map((method) => (
            <a
              key={method.title}
              href={method.href}
              className="rounded-md border border-slate-100 bg-slate-50 p-5 transition hover:border-blue-100 hover:bg-blue-50"
            >
              <h2 className="text-lg font-bold text-slate-950">{method.title}</h2>
              <p className="mt-2 font-semibold text-blue-700" dir="ltr">
                {method.value}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{method.note}</p>
            </a>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">متى تتواصل معنا؟</h2>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            <li>قبل الطلب لتأكيد التوفر أو المقاس أو اللون أو نوع الاستخدام المناسب.</li>
            <li>بعد الطلب لمتابعة حالة الطلب أو تعديل بيانات التواصل قبل الشحن إن أمكن.</li>
            <li>عند وجود استفسار عن منتج عناية، منظف، معطر، إكسسوار، أداة، إضاءة، أو سوائل سيارة.</li>
            <li>لطلب مساعدة بخصوص الاستبدال أو الإرجاع وفق سياسة المتجر المنشورة.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">أسئلة سريعة عن التواصل</h2>
          {faqs.map((faq) => (
            <article key={faq.question} className="border-b border-slate-100 pb-4 last:border-0">
              <h3 className="font-bold text-slate-950">{faq.question}</h3>
              <p className="mt-2 leading-8 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
            تصفح المنتجات
          </Link>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/ordering-guide">
            دليل الطلب
          </Link>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/shipping">
            معلومات الشحن
          </Link>
          <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/return-policy">
            سياسة الإرجاع والاستبدال
          </Link>
        </div>
      </section>
    </main>
  );
}
