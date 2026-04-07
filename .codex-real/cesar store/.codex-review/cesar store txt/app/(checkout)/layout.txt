"use client";

import type { ReactNode } from "react";
import { OrderTrackingProvider } from "@/context/OrderTrackingContext";

export default function CheckoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrderTrackingProvider>
      {/* أضفنا تغليفاً بسيطاً لضمان أن جميع صفحات الدفع 
          تبدأ من أعلى الصفحة وتأخذ كامل الارتفاع مع خلفية متناسقة
      */}
      <main className="min-h-screen bg-[#F8FAFC] antialiased">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </OrderTrackingProvider>
  );
}