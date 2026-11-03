"use client";

import { Clock3, Database, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useStoreMaintenance } from "@/context/StoreMaintenanceContext";

function formatCountdownUnit(value: number, lang: "ar" | "en") {
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(value);
}
export default function StoreMaintenanceOverlay() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { countdown, endsAt, isMaintenanceActive } = useStoreMaintenance();
  const isAr = lang === "ar";

  if (!isMaintenanceActive || pathname !== "/") return null;

  const endLabel = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(endsAt));
  const units = [
    {
      label: isAr ? "ساعة" : "Hours",
      value: countdown.hours,
    },
    {
      label: isAr ? "دقيقة" : "Minutes",
      value: countdown.minutes,
    },
    {
      label: isAr ? "ثانية" : "Seconds",
      value: countdown.seconds,
    },
  ];

  return (
    <section
      className="maintenance-overlay fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] top-24 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/[0.48] p-4 backdrop-blur-md md:bottom-0 md:top-28 md:p-8"
      dir={isAr ? "rtl" : "ltr"}
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-description maintenance-end"
    >
      <div className="maintenance-glass relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/[0.88] px-5 py-7 text-center shadow-[0_32px_100px_rgba(15,23,42,0.38)] ring-1 ring-white/40 backdrop-blur-2xl sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_68%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-slate-950 text-white shadow-xl shadow-slate-900/20 sm:h-20 sm:w-20">
          <Database className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
          <Sparkles
            className="absolute -right-2 -top-2 h-6 w-6 text-amber-400"
            aria-hidden="true"
          />
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/90 px-4 py-2 text-xs font-black text-blue-700">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {isAr ? "تحديث مؤقت مجدول" : "Scheduled maintenance update"}
          </span>
          <h1
            id="maintenance-title"
            className="mt-5 text-2xl font-black leading-tight text-slate-950 sm:text-4xl"
          >
            {isAr
              ? "نعتذر، يتم تحديث قاعدة البيانات الآن"
              : "We’re updating our database"}
          </h1>
          <p
            id="maintenance-description"
            className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-600 sm:text-base"
          >
            {isAr
              ? "يمكنك تصفح المتجر والأقسام، وستظهر الأسعار الجديدة تلقائيًا فور اكتمال التحديث."
              : "You can browse the shop and categories. New prices will appear automatically when the update is complete."}
          </p>

          <div
            className="mx-auto mt-7 grid max-w-xl grid-cols-3 gap-2 sm:gap-4"
            aria-hidden="true"
            dir={isAr ? "rtl" : "ltr"}
          >
            {units.map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border border-white/80 bg-slate-950/[0.94] px-2 py-4 text-white shadow-lg shadow-slate-900/15 sm:rounded-3xl sm:px-4 sm:py-5"
              >
                <div
                  className="font-mono text-2xl font-black tabular-nums tracking-tight sm:text-4xl"
                  dir="ltr"
                >
                  {formatCountdownUnit(unit.value, lang)}
                </div>
                <div className="mt-1 text-[10px] font-black text-slate-300 sm:text-xs">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>

          <p
            id="maintenance-end"
            className="mx-auto mt-5 max-w-xl text-xs font-bold leading-6 text-slate-500 sm:text-sm"
            aria-live="polite"
          >
            {isAr ? "موعد العودة المتوقع: " : "Expected reopening: "}
            <span className="font-black text-slate-800">{endLabel}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
