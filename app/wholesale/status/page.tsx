"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { WholesaleApplicationStatus } from "@/types/wholesale";

type PublicApplicationStatus = {
  id: string;
  businessName: string;
  contactName: string;
  status: WholesaleApplicationStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusContent: Record<
  WholesaleApplicationStatus,
  {
    label: string;
    title: string;
    description: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  pending: {
    label: "تم الاستلام",
    title: "طلبك تم استلامه",
    description: "فريق سيزر سيبدأ مراجعة البيانات والمستندات الرسمية.",
    className: "border-amber-100 bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  under_review: {
    label: "قيد المراجعة",
    title: "طلبك قيد المراجعة",
    description: "جاري فحص بيانات الكيان والمستندات المرفوعة.",
    className: "border-blue-100 bg-blue-50 text-blue-700",
    icon: ShieldCheck,
  },
  approved: {
    label: "تمت الموافقة",
    title: "تمت الموافقة على طلب الجملة",
    description:
      "الخطوة التالية هي تفعيل حساب الجملة وإتاحة كتالوج وأسعار الجملة.",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "مرفوض",
    title: "لم تتم الموافقة على الطلب",
    description:
      "يمكنك مراجعة الملاحظات والتواصل مع فريق سيزر لتصحيح البيانات عند الحاجة.",
    className: "border-rose-100 bg-rose-50 text-rose-700",
    icon: XCircle,
  },
};

export default function WholesaleStatusPage() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";
  const initialPhone = searchParams.get("phone") || "";
  const [applicationId, setApplicationId] = useState(initialId);
  const [phone, setPhone] = useState(initialPhone);
  const [application, setApplication] = useState<PublicApplicationStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const liveRequestInFlightRef = useRef(false);

  const canSubmit = applicationId.trim().length > 0 && phone.trim().length >= 10;

  const status = useMemo(
    () => (application ? statusContent[application.status] : null),
    [application]
  );

  useEffect(() => {
    setApplicationId(initialId);
    setPhone((currentPhone) => {
      if (initialPhone) return initialPhone;
      if (!initialId || currentPhone.trim()) return currentPhone;

      return window.localStorage.getItem(`wholesale-status-phone:${initialId}`) || "";
    });
  }, [initialId, initialPhone]);

  const loadStatus = useCallback(
    async ({
      silent = false,
      clearCurrent = false,
    }: {
      silent?: boolean;
      clearCurrent?: boolean;
    } = {}) => {
      const nextId = applicationId.trim();
      const nextPhone = phone.trim();

      if (!nextId || nextPhone.length < 10) return;

      if (silent) setLiveLoading(true);
      else setLoading(true);
      setError(null);
      if (clearCurrent) setApplication(null);

    try {
      const response = await fetch(
        `/api/wholesale/applications/status?id=${encodeURIComponent(
          nextId
        )}&phone=${encodeURIComponent(nextPhone)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل حالة الطلب");
      }

      window.localStorage.setItem(`wholesale-status-phone:${nextId}`, nextPhone);
      setApplication(payload.application);
      setLastLiveUpdate(new Date().toISOString());
    } catch (statusError) {
      if (!silent) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "تعذر تحميل حالة الطلب"
        );
      }
    } finally {
      if (silent) setLiveLoading(false);
      else setLoading(false);
    }
    },
    [applicationId, phone]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    await loadStatus({ clearCurrent: true });
  }

  useEffect(() => {
    if (!initialId || phone.trim().length < 10 || application) return;
    loadStatus({ clearCurrent: true });
  }, [application, initialId, loadStatus, phone]);

  useEffect(() => {
    if (!application || !canSubmit) return;

    function refreshStatus() {
      if (document.visibilityState !== "visible") return;
      if (liveRequestInFlightRef.current) return;

      liveRequestInFlightRef.current = true;
      loadStatus({ silent: true }).finally(() => {
        liveRequestInFlightRef.current = false;
      });
    }

    const interval = window.setInterval(() => {
      refreshStatus();
    }, 5000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshStatus();
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [application, canSubmit, loadStatus]);

  return (
    <div dir="rtl" className="min-h-[75vh] bg-slate-50 px-4 py-10 text-slate-950 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/wholesale"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لقسم الجملة
        </Link>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
            <h1 className="text-3xl font-black text-slate-950">
              متابعة طلب الجملة
            </h1>
            <p className="mt-3 leading-8 text-slate-600">
              أدخل رقم الطلب ورقم الهاتف أو واتساب المستخدم في التقديم لعرض
              حالة المراجعة.
            </p>
            {application && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                متابعة تلقائية كل 5 ثواني
                {liveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  رقم الطلب
                </span>
                <input
                  value={applicationId}
                  onChange={(event) => setApplicationId(event.target.value)}
                  className="field-input text-left"
                  dir="ltr"
                  placeholder="Application ID"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  رقم الهاتف أو واتساب
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="field-input"
                  inputMode="numeric"
                  placeholder="01xxxxxxxxx"
                  required
                />
              </label>

              {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "جار البحث..." : "عرض حالة الطلب"}
              </button>
              {lastLiveUpdate && (
                <p className="text-center text-xs font-bold text-slate-400">
                  آخر تحديث: {new Date(lastLiveUpdate).toLocaleTimeString("ar-EG")}
                </p>
              )}
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
            {!application || !status ? (
              <div className="flex h-full min-h-80 flex-col justify-center rounded-xl bg-slate-50 p-6 text-center">
                <Clock3 className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-black text-slate-800">
                  حالة الطلب ستظهر هنا
                </h2>
                <p className="mt-3 leading-7 text-slate-500">
                  استخدم بيانات الطلب التي ظهرت بعد التقديم، أو تواصل مع سيزر
                  لو فقدت رقم الطلب.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className={`rounded-2xl border p-5 ${status.className}`}>
                  <status.icon className="h-9 w-9" />
                  <div className="mt-4 text-sm font-black">{status.label}</div>
                  <h2 className="mt-2 text-2xl font-black">{status.title}</h2>
                  <p className="mt-3 leading-7">{status.description}</p>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <Info label="اسم الكيان" value={application.businessName} />
                  <Info label="اسم المسؤول" value={application.contactName} />
                  <Info
                    label="تاريخ التقديم"
                    value={new Date(application.createdAt).toLocaleString("ar-EG")}
                  />
                  <Info
                    label="آخر تحديث"
                    value={new Date(application.updatedAt).toLocaleString("ar-EG")}
                  />
                </div>

                {application.reviewNotes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black text-slate-400">
                      ملاحظات المراجعة
                    </div>
                    <p className="mt-2 leading-7 text-slate-700">
                      {application.reviewNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
