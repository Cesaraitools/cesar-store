import "./globals.css";
import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F172A",
};

export function generateMetadata(): Metadata {
  return {
    manifest: "/manifest.json",
    title: "متجر سيزر | Cesar Store",
    description: "الوجهة الأولى لمنتجات العناية بالسيارات والكماليات الأصلية",
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ar" className="scroll-smooth">
      <body className="bg-[#F8FAFC] min-h-screen text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <CheckoutProvider>
                <div className="flex flex-col min-h-screen">
                  {/* Navbar مع تأثير زجاجي شفاف */}
                  <Navbar />
                  
                  <main className="flex-grow pt-5 md:pt-7">
                    {children}
                  </main>
                    <Toaster position="top-center" />
                  {/* Footer بسيط وعصري */}
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
