"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  Play,
  ShieldCheck,
  Square,
  Store,
  Wrench,
} from "lucide-react";
import {
  INACTIVE_STORE_MAINTENANCE,
  MAX_MAINTENANCE_DURATION_MINUTES,
  formatMaintenanceCountdown,
  getStoreMaintenanceRemainingMs,
  isStoreMaintenanceActive,
  validateStoreMaintenanceDuration,
  type StoreMaintenanceSchedule,
} from "@/lib/store-maintenance";

type AdminSchedule = StoreMaintenanceSchedule & {
  updatedBy?: string | null;
};

const PRESETS = [
  { label: "30 دقيقة", hours: 0, minutes: 30 },
  { label: "ساعة", hours: 1, minutes: 0 },
  { label: "ساعتان", hours: 2, minutes: 0 },
  { label: "24 ساعة", hours: 24, minutes: 0 },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

export default function MaintenanceModeClient() {
  const [schedule, setSchedule] = useState<AdminSchedule>(
    INACTIVE_STORE_MAINTENANCE
  );
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [now, setNow] = useState(0);
  const clockOffsetRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = isStoreMaintenanceActive(schedule, now);
  const remainingMs = getStoreMaintenanceRemainingMs(schedule, now);
  const expired =
    schedule.enabled &&
    Boolean(schedule.endsAt) &&
    Date.parse(schedule.endsAt || "") <= now;

  const loadSchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/maintenance-mode", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        schedule?: AdminSchedule;
        serverNow?: number;
        error?: string;
      };

      if (!response.ok || !payload.schedule) {
        throw new Error(payload.error || "تعذر تحميل حالة وضع الصيانة.");
      }

      if (typeof payload.serverNow === "number") {
        clockOffsetRef.current = payload.serverNow - Date.now();
      }
      setSchedule(payload.schedule);
      setNow(Date.now() + clockOffsetRef.current);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل حالة وضع الصيانة."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
    const timer = window.setInterval(
      () => setNow(Date.now() + clockOffsetRef.current),
      1000
    );
    return () => window.clearInterval(timer);
  }, [loadSchedule]);

  const durationLabel = useMemo(() => {
    const parts = [];
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    return parts.join(" و") || "أقل من دقيقة";
  }, [hours, minutes]);

  async function startMaintenance() {
    setError(null);
    setMessage(null);

    try {
      validateStoreMaintenanceDuration(hours, minutes);
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "حدد مدة صحيحة لا تقل عن دقيقة واحدة."
      );
      return;
    }

    const confirmed = window.confirm(
      `سيتم الآن تفعيل وضع الصيانة لمدة ${durationLabel}.\n\nستختفي الأسعار ويتوقف الشراء والطلب، بينما يبقى التصفح ولوحة الإدارة متاحين. هل تريد المتابعة؟`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/maintenance-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, minutes }),
      });
      const payload = (await response.json()) as {
        schedule?: AdminSchedule;
        serverNow?: number;
        error?: string;
      };

      if (!response.ok || !payload.schedule) {
        throw new Error(payload.error || "تعذر بدء وضع الصيانة.");
      }

      if (typeof payload.serverNow === "number") {
        clockOffsetRef.current = payload.serverNow - Date.now();
      }
      setSchedule(payload.schedule);
      setNow(Date.now() + clockOffsetRef.current);
      setMessage("تم تفعيل وضع الصيانة بنجاح. سيعود المتجر تلقائيًا عند انتهاء العدّاد.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر بدء وضع الصيانة."
      );
    } finally {
      setSaving(false);
    }
  }

  async function stopMaintenance() {
    setError(null);
    setMessage(null);
    if (!window.confirm("هل تريد إنهاء وضع الصيانة الآن وإعادة الأسعار والشراء فورًا؟")) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/maintenance-mode", {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        schedule?: AdminSchedule;
        serverNow?: number;
        error?: string;
      };

      if (!response.ok || !payload.schedule) {
        throw new Error(payload.error || "تعذر إنهاء وضع الصيانة.");
      }

      if (typeof payload.serverNow === "number") {
        clockOffsetRef.current = payload.serverNow - Date.now();
      }
      setSchedule(payload.schedule);
      setNow(Date.now() + clockOffsetRef.current);
      setMessage("تم إنهاء وضع الصيانة وعادت الأسعار والطلبات للعمل.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر إنهاء وضع الصيانة."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
            <Wrench className="h-4 w-4" />
            Maintenance Mode
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            وضع الصيانة المؤقت
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
            حدد مدة تحديث قاعدة البيانات. سيبقى المتجر والأقسام ولوحة الإدارة متاحين،
            مع إخفاء الأسعار وإيقاف الشراء والطلبات حتى ينتهي الوقت تلقائيًا.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-2xl px-5 py-3 text-sm font-black ${
            active
              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          }`}
        >
          {active ? <Clock3 className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          {loading ? "جاري التحقق..." : active ? "وضع الصيانة مفعل" : "المتجر يعمل طبيعيًا"}
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Clock3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">تحديد مدة الصيانة</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">أقصى مدة مسموحة 30 يومًا.</p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">عدد الساعات</span>
              <input
                type="number"
                min={0}
                max={MAX_MAINTENANCE_DURATION_MINUTES / 60}
                step={1}
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tabular-nums text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                disabled={saving}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">عدد الدقائق</span>
              <input
                type="number"
                min={0}
                max={59}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tabular-nums text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                disabled={saving}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setHours(preset.hours);
                  setMinutes(preset.minutes);
                }}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm font-bold leading-7 text-blue-900">
                عند التشغيل ستختفي الأسعار وتتوقف السلة والدفع والطلبات من الخادم،
                ثم يعود كل شيء تلقائيًا فور وصول العدّاد إلى الصفر.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startMaintenance}
              disabled={saving || loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              {active ? "إعادة ضبط المدة وبدء عدّاد جديد" : "بدء وضع الصيانة"}
            </button>
            {active && (
              <button
                type="button"
                onClick={stopMaintenance}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <Square className="h-4 w-4 fill-current" />
                إنهاء الصيانة الآن
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/70">
          <div className="border-b border-white/10 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Live status</p>
                <h2 className="mt-2 text-xl font-black">الحالة الحالية</h2>
              </div>
              <div className={`h-3 w-3 rounded-full ${active ? "animate-pulse bg-rose-400" : "bg-emerald-400"}`} />
            </div>

            <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center">
              <p className="text-xs font-bold text-slate-400">الوقت المتبقي</p>
              <div className="mt-2 font-mono text-3xl font-black tabular-nums tracking-wider sm:text-4xl" dir="ltr">
                {active
                  ? formatMaintenanceCountdown(remainingMs)
                  : "00 : 00 : 00"}
              </div>
              <p className="mt-2 text-xs font-bold text-slate-400">ساعة : دقيقة : ثانية</p>
            </div>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <span className="text-sm font-bold text-slate-400">بدأ في</span>
              <span className="text-left text-sm font-black" dir="ltr">{formatDate(schedule.startsAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <span className="text-sm font-bold text-slate-400">ينتهي في</span>
              <span className="text-left text-sm font-black" dir="ltr">{formatDate(schedule.endsAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-400">الحالة</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-rose-400/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300"}`}>
                {active ? "نشط الآن" : expired ? "انتهى تلقائيًا" : "غير مفعل"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Store, title: "التصفح مستمر", body: "يبقى المتجر والأقسام متاحين للعملاء." },
          { icon: Database, title: "الطلبات محمية", body: "يرفض الخادم أي طلب جديد طوال المدة." },
          { icon: CheckCircle2, title: "عودة تلقائية", body: "لا تحتاج للعودة إلى الشاشة عند انتهاء الوقت." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <item.icon className="h-6 w-6 text-blue-600" />
            <h3 className="mt-3 font-black text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
