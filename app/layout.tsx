import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import * as Sentry from "@sentry/nextjs";
import { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WholesaleCartProvider } from "@/context/WholesaleDbCartContext";
import {
  BRAND_SEARCH_TERMS,
  CONTACT_EMAIL,
  CONTACT_PHONE_E164,
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  PRODUCT_SEARCH_TERMS,
  SITE_ALTERNATE_NAMES,
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
    keywords: [...BRAND_SEARCH_TERMS, ...PRODUCT_SEARCH_TERMS],
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
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    other: {
      ...Sentry.getTraceData(),
      "facebook-domain-verification": "2wy8f55ia53xqhgg0fmddfv0ho754r",
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const googleTagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
  const googleAdsId =
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18319168682";
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const googleTagLoaderId =
    googleTagId && !googleTagId.startsWith("G-")
      ? googleTagId
      : googleAdsId || googleAnalyticsId || googleTagId;
  const googleConfigScript = Array.from(
    new Set([googleTagId, googleAdsId, googleAnalyticsId].filter(Boolean))
  )
    .map((id) => `gtag('config', '${id}');`)
    .join("\n");
  const clarityProjectId =
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "xnk6ch24vb";
  const storeStructuredData = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "@id": `${SITE_URL}/#store`,
    additionalType: "https://schema.org/Store",
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    url: SITE_URL,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_SEO_DESCRIPTION,
    slogan: "Car care products and car accessories in Egypt",
    keywords: [...BRAND_SEARCH_TERMS, ...PRODUCT_SEARCH_TERMS].join(", "),
    telephone: CONTACT_PHONE_E164,
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_LINKS,
    priceRange: "EGP",
    currenciesAccepted: "EGP",
    paymentAccepted: ["Cash on delivery", "Cash"],
    availableLanguage: ["ar", "en"],
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
    knowsAbout: PRODUCT_SEARCH_TERMS,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
      alternateName: [SITE_NAME_AR, "Cesar Shop"],
    },
    inLanguage: ["ar-EG", "en"],
  };
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    url: SITE_URL,
    inLanguage: ["ar-EG", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/shop")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl(DEFAULT_OG_IMAGE),
      sameAs: SOCIAL_LINKS,
    },
  };

  return (
    <html lang="ar" dir="rtl" className="scroll-smooth" suppressHydrationWarning>
      <body
        className="bg-[#F8FAFC] min-h-screen text-slate-900 antialiased selection:bg-blue-600 selection:text-white"
        suppressHydrationWarning
      >
        {googleTagLoaderId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleTagLoaderId}`}
              strategy="afterInteractive"
            />
            <Script id="google-tag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${googleConfigScript}
              `}
            </Script>
          </>
        )}
        {clarityProjectId && (
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
            `}
          </Script>
        )}
        <script
          id="store-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(storeStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <WholesaleCartProvider>
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
                  <SiteFooter />
                </div>
              </WholesaleCartProvider>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
