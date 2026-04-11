import "./globals.css";
import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "متجر سيزر | Cesar Store",
  description: "الوجهة الأولى لمنتجات العناية بالسيارات والكماليات الأصلية",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ar">
      <body className="bg-[#FCFDFF] min-h-screen text-gray-900 selection:bg-blue-100 selection:text-blue-700">
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <CheckoutProvider>
                {/* تم تغليف المحتوى داخل Flexbox لضمان ظهور الـ Navbar والـ Content بشكل متناسق */}
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  
                  {/* أضفت Padding علوي يتناسب مع ارتفاع الـ Navbar لتجنب تداخل المحتوى */}
                  <main className="flex-grow pt-20">
                    {children}
                  </main>

                  {/* مساحة إضافية اختيارية للـ Footer مستقبلاً */}
                </div>
              </CheckoutProvider>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}