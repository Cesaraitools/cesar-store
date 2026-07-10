"use client";

import { useState } from "react";
import { Loader2, RadioTower, Send } from "lucide-react";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string; result: SubmitResult }
  | { status: "error"; message: string; result?: SubmitResult };

type SubmitResult = {
  bingStatus: number;
  urlsCount: number;
  responseText: string;
  submittedAt: string;
};

function formatSubmittedAt() {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());
}

export default function IndexNowSubmitButton() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setState({ status: "idle" });

    try {
      const response = await fetch("/api/admin/indexnow/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => null)) as {
        submitted?: boolean;
        status?: number;
        urlsCount?: number;
        responseText?: string;
        error?: string;
      } | null;
      const result: SubmitResult = {
        bingStatus: data?.status || response.status,
        urlsCount: data?.urlsCount || 0,
        responseText: String(data?.responseText || "").trim(),
        submittedAt: formatSubmittedAt(),
      };

      if (!response.ok || !data?.submitted) {
        setState({
          status: "error",
          result,
          message:
            data?.error ||
            `لم يتم إرسال الروابط إلى Bing. حالة IndexNow: ${data?.status || response.status}`,
        });
        return;
      }

      setState({
        status: "success",
        result,
        message: `قبل Bing API إرسال ${data.urlsCount || 0} رابط عبر IndexNow.`,
      });
    } catch {
      setState({
        status: "error",
        message: "تعذر إرسال الروابط الآن. راجع الاتصال أو سجلات Vercel.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-blue-800">
            <RadioTower className="h-4 w-4" />
            Bing IndexNow
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-blue-700">
            أرسل صفحات الموقع والمنتجات النشطة إلى Bing لتسريع اكتشاف التحديثات.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? "جاري الإرسال" : "إرسال IndexNow إلى Bing"}
        </button>
      </div>
      {state.status !== "idle" ? (
        <div
          className={`mt-3 rounded-xl px-3 py-3 text-sm font-bold ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          <p>{state.message}</p>
          {state.result ? (
            <dl className="mt-3 grid gap-2 text-xs font-black sm:grid-cols-3" dir="rtl">
              <div className="rounded-lg bg-white/70 p-2">
                <dt className="text-slate-500">كود استجابة Bing</dt>
                <dd className="mt-1 text-slate-950" dir="ltr">
                  {state.result.bingStatus}
                </dd>
              </div>
              <div className="rounded-lg bg-white/70 p-2">
                <dt className="text-slate-500">عدد الروابط</dt>
                <dd className="mt-1 text-slate-950">{state.result.urlsCount}</dd>
              </div>
              <div className="rounded-lg bg-white/70 p-2">
                <dt className="text-slate-500">وقت الإرسال</dt>
                <dd className="mt-1 text-slate-950">{state.result.submittedAt}</dd>
              </div>
              {state.result.responseText ? (
                <div className="rounded-lg bg-white/70 p-2 sm:col-span-3">
                  <dt className="text-slate-500">رد Bing</dt>
                  <dd className="mt-1 break-words text-slate-950" dir="ltr">
                    {state.result.responseText.slice(0, 300)}
                  </dd>
                </div>
              ) : (
                <div className="rounded-lg bg-white/70 p-2 sm:col-span-3">
                  <dt className="text-slate-500">رد Bing</dt>
                  <dd className="mt-1 text-slate-950">
                    لا يوجد نص في الرد، وهذا طبيعي مع بعض استجابات IndexNow الناجحة.
                  </dd>
                </div>
              )}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
