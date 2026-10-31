"use client";

import type { ReactNode } from "react";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { OrderTrackingProvider } from "@/context/OrderTrackingContext";
import { usePathname } from "next/navigation";
import PurchasePausedPanel from "@/components/maintenance/PurchasePausedPanel";
import { useStoreMaintenance } from "@/context/StoreMaintenanceContext";

export default function CheckoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { isMaintenanceActive } = useStoreMaintenance();
  const blocksPurchase =
    pathname === "/checkout" || pathname === "/review";

  if (isMaintenanceActive && blocksPurchase) {
    return <PurchasePausedPanel />;
  }

  return (
    <OrderTrackingProvider>
      <CheckoutProvider>
        {/* أضفنا تغليفاً بسيطاً لضمان أن جميع صفحات الدفع
            تبدأ من أعلى الصفحة وتأخذ كامل الارتفاع مع خلفية متناسقة
        */}
        <main className="min-h-screen bg-[#F8FAFC] antialiased">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </CheckoutProvider>
    </OrderTrackingProvider>
  );
}
