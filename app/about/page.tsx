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
  SITE_ALTERNATE_NAMES,
  SITE_URL,
  SOCIAL_LINKS,
  absoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرف على متجر سيزر، متجر مصري لمنتجات وإكسسوارات السيارات والعناية بها، مع بيانات التواصل وروابط المتجر الرسمية.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "من نحن | Cesar Store",
    description:
      "متجر سيزر يقدم منتجات عناية وإكسسوارات وأدوات مختارة للسيارات داخل مصر.",
    url: absoluteUrl("/about"),
    siteName: SITE_NAME,
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

const facts = [
  { label: "الاسم التجاري", value: `${SITE_NAME_AR} - ${SITE_NAME}` },
  { label: "السوق", value: "مصر" },
  { label: "العملة", value: "الجنيه المصري EGP" },
  { label: "اللغة الأساسية", value: "العربية" },
  { label: "اللغة الثانوية", value: "الإنجليزية" },
];

const categories = [
  "منتجات العناية بالسيارات",
  "معطرات السيارات",
  "منظفات وإكسسوارات",
  "أدوات ومنتجات إضاءة",
  "منتجات مختارة للاستخدام اليومي داخل السيارة",
];

const brandAliases = [
  "متجر سيزر",
  "سيزر ستور",
  "سيزر شوب",
  "موقع سيزر",
  "Cesar Store",
  "Cesar Shop",
  "cesareshop.com",
];

export default function AboutPage() {
  const aboutStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "من نحن | Cesar Store",
      url: absoluteUrl("/about"),
      inLanguage: "ar-EG",
      about: {
        "@type": "AutoPartsStore",
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAMES,
      url: SITE_URL,
      logo: absoluteUrl(DEFAULT_OG_IMAGE),
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
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aboutStructuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="space-y-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100 md:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">Cesar Store</p>
          <h1 className="text-3xl font-bold text-slate-950">من نحن</h1>
          <p className="leading-8 text-slate-600">
            متجر سيزر هو متجر إلكتروني مصري يهتم بمنتجات وإكسسوارات السيارات، ويجمع
            منتجات مختارة للعناية بالسيارة، تحسين تجربة الاستخدام، وتسهيل الوصول إلى
            المنتجات المناسبة داخل مصر.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-md bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{fact.label}</p>
              <p className="mt-1 font-bold text-slate-950">{fact.value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">ماذا يقدم متجر سيزر؟</h2>
          <p className="leading-8 text-slate-600">
            يقدم المتجر منتجات مرتبطة بالعناية بالسيارات والاستخدام اليومي، مع تنظيم
            المنتجات داخل صفحات واضحة للأقسام والمنتجات، وتحديث بيانات المنتجات من
            مصدر الموقع الرسمي.
          </p>
          <ul className="list-inside list-disc space-y-2 leading-8 text-slate-600">
            {categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">
            أسماء ومفردات يستخدمها العملاء للوصول إلى المتجر
          </h2>
          <p className="leading-8 text-slate-600">
            قد يبحث العملاء عن المتجر بأكثر من صيغة عربية أو إنجليزية. لذلك يوضح
            الموقع أن متجر سيزر هو نفسه Cesar Store وCesar Shop وموقع سيزر لمنتجات
            وإكسسوارات السيارات داخل مصر.
          </p>
          <div className="flex flex-wrap gap-2">
            {brandAliases.map((alias) => (
              <span
                key={alias}
                className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {alias}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">طريقة الطلب والتواصل</h2>
          <p className="leading-8 text-slate-600">
            يمكن للعميل تصفح المنتجات من صفحة المتجر أو الأقسام، فتح صفحة المنتج،
            اختيار المواصفات المناسبة إن وجدت، ثم إضافة المنتج إلى السلة وإكمال
            الطلب. للاستفسار قبل أو بعد الطلب يمكن التواصل عبر واتساب أو البريد
            الإلكتروني أو الهاتف.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href={CONTACT_WHATSAPP_URL}
              className="rounded-md border border-emerald-100 bg-emerald-50 p-4 font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              واتساب
            </a>
            <a
              href={`tel:${CONTACT_PHONE_E164}`}
              className="rounded-md border border-blue-100 bg-blue-50 p-4 font-semibold text-blue-700 transition hover:bg-blue-100"
              dir="ltr"
            >
              {CONTACT_PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-md border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-700 transition hover:bg-slate-100"
              dir="ltr"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-950">روابط مهمة</h2>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/shop">
              تصفح المنتجات
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/categories">
              الأقسام
            </Link>
            <Link className="rounded-md bg-slate-100 px-4 py-2 text-slate-800" href="/faq">
              الأسئلة الشائعة
            </Link>
            <Link
              className="rounded-md bg-slate-100 px-4 py-2 text-slate-800"
              href="/return-policy"
            >
              سياسة الإرجاع والاستبدال
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
