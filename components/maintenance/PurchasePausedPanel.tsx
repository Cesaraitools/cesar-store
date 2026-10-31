"use client";

import Link from "next/link";
import { Clock3, Database, Store } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useStoreMaintenance } from "@/context/StoreMaintenanceContext";

export default function PurchasePausedPanel() {
  const { lang } = useLanguage();
  const { endsAt } = useStoreMaintenance();
  const isAr = lang === "ar";
  const endLabel = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(endsAt));

  return (
    <main
      className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4 py-12"
      dir={isAr ? "rtl" : "ltr"}
    >
      <section className="w-full max-w-2xl rounded-[2rem] border border-blue-100 bg-white p-7 text-center shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
          <Database className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950 sm:text-3xl">
          {isAr ? "الشراء متوقف مؤقتًا" : "Purchases are temporarily paused"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-7 text-slate-600 sm:text-base">
          {isAr
            ? "نحدّث الأسعار حاليًا، لذلك حافظنا على محتويات سلتك وأوقفنا الدفع حتى لا يتم تسجيل طلب بسعر قديم."
            : "We’re updating prices, so your cart is preserved and checkout is paused to prevent orders using an old price."}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 sm:text-sm">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {isAr ? "العودة المتوقعة: " : "Expected return: "}
          {endLabel}
        </p>
        <div className="mt-7">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Store className="h-5 w-5" aria-hidden="true" />
            {isAr ? "تصفح المتجر" : "Browse the shop"}
          </Link>
        </div>
      </section>
    </main>
  );
}
