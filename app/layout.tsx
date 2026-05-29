import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_E164,
  CONTACT_WHATSAPP_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SITE_NAME,
  SITE_NAME_AR,
  SITE_URL,
  SOCIAL_LINKS,
  SOCIAL_PROFILES,
  absoluteUrl,
} from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F172A",
};

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    manifest: "/manifest.json",
    applicationName: SITE_NAME,
    title: {
      default: DEFAULT_SEO_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_SEO_DESCRIPTION,
    keywords: [
      "Cesar Store",
      "متجر سيزر",
      "منتجات السيارات",
      "اكسسوارات سيارات",
      "معطرات سيارات",
      "عناية بالسيارات",
      "car accessories Egypt",
      "car care products Egypt",
    ],
    alternates: {
      canonical: "/",
      languages: {
        ar: "/",
        en: "/",
      },
    },
    openGraph: {
      type: "website",
      locale: "ar_EG",
      alternateLocale: ["en_US"],
      siteName: SITE_NAME,
      title: DEFAULT_SEO_TITLE,
      description: DEFAULT_SEO_DESCRIPTION,
      url: SITE_URL,
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          width: 512,
          height: 512,
          alt: `${SITE_NAME_AR} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_SEO_TITLE,
      description: DEFAULT_SEO_DESCRIPTION,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const storeStructuredData = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: SITE_URL,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_SEO_DESCRIPTION,
    telephone: CONTACT_PHONE_E164,
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_LINKS,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: CONTACT_PHONE_E164,
      email: CONTACT_EMAIL,
      contactType: "customer support",
      areaServed: "EG",
      availableLanguage: ["ar", "en"],
    },
    areaServed: {
      "@type": "Country",
      name: "Egypt",
    },
    inLanguage: ["ar-EG", "en"],
  };

  return (
    <html lang="ar" className="scroll-smooth">
      <body className="bg-[#F8FAFC] min-h-screen text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(storeStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <CheckoutProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />

                  <main className="flex-grow pt-5 md:pt-7">{children}</main>
                  <Toaster
                    position="top-center"
                    containerStyle={{ zIndex: 2147483647 }}
                    toastOptions={{
                      duration: 3000,
                    }}
                  />
                  <footer className="bg-white border-t border-slate-100 py-8 text-center text-sm font-medium text-slate-500">
                    <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4">
                      <Link
                        href="/return-policy"
                        className="text-slate-700 transition hover:text-blue-700"
                      >
                        سياسة الإرجاع والاستبدال
                      </Link>

                      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        <a
                          href={`tel:${CONTACT_PHONE_E164}`}
                          className="transition hover:text-blue-700"
                        >
                          {CONTACT_PHONE_DISPLAY}
                        </a>
                        <a
                          href={`mailto:${CONTACT_EMAIL}`}
                          className="transition hover:text-blue-700"
                        >
                          {CONTACT_EMAIL}
                        </a>
                        <a
                          href={CONTACT_WHATSAPP_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-blue-700"
                        >
                          WhatsApp
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        <a
                          href={SOCIAL_PROFILES.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-blue-700"
                        >
                          Facebook
                        </a>
                        <a
                          href={SOCIAL_PROFILES.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-blue-700"
                        >
                          Instagram
                        </a>
                        <a
                          href={SOCIAL_PROFILES.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-blue-700"
                        >
                          TikTok
                        </a>
                      </div>

                      <div className="text-slate-400">
                        © {new Date().getFullYear()} متجر سيزر. جميع الحقوق محفوظة.
                      </div>
                    </div>
                  </footer>
                </div>
              </CheckoutProvider>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
