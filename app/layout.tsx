import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import * as Sentry from "@sentry/nextjs";
import { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SITE_NAME,
  SITE_NAME_AR,
  SITE_URL,
  SOCIAL_LINKS,
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
    sameAs: SOCIAL_LINKS,
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
                  <Toaster position="top-center" />
                  <footer className="bg-white border-t border-slate-100 py-8 text-center text-slate-400 text-sm font-medium">
                    © {new Date().getFullYear()} متجر سيزر. جميع الحقوق محفوظة.
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
