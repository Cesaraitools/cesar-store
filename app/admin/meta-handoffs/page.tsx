"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type MetaHandoff = {
  id: string;
  reason: string;
  commentId: string;
  postId: string;
  messageText: string;
  permalinkUrl: string;
  productsCount: number | null;
  bestScore: number | null;
  createdAt: string;
};

function reasonLabel(reason: string) {
  switch (reason) {
    case "low_confidence_product_match":
      return "تطابق ضعيف ويحتاج رد بشري";
    case "comment_auto_reply_disabled":
      return "الرد التلقائي على التعليقات متوقف";
    case "comment_post_not_allowed":
      return "المنشور غير مسموح له بالرد التلقائي";
    case "rate_limited":
      return "تم إيقاف الرد بسبب كثرة التعليقات";
    default:
      return reason;
  }
}

function facebookFallbackUrl(handoff: MetaHandoff) {
  if (handoff.permalinkUrl) return handoff.permalinkUrl;
  if (handoff.commentId) return `https://www.facebook.com/${handoff.commentId}`;
  if (handoff.postId) return `https://www.facebook.com/${handoff.postId}`;

  return "https://www.facebook.com/";
}

export default function MetaHandoffsPage() {
  const [handoffs, setHandoffs] = useState<MetaHandoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pendingCount = handoffs.length;
  const lowConfidenceCount = useMemo(
    () =>
      handoffs.filter((handoff) => handoff.reason === "low_confidence_product_match")
        .length,
    [handoffs]
  );

  async function loadHandoffs() {
    try {
      setError("");
      const response = await fetch("/api/admin/meta-handoffs", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to load handoffs");

      const data = await response.json();
      setHandoffs(Array.isArray(data.handoffs) ? data.handoffs : []);
    } catch {
      setError("تعذر تحميل التعليقات التي تحتاج متابعة.");
    } finally {
      setLoading(false);
    }
  }

  async function markHandled(id: string) {
    try {
      setBusyId(id);
      const response = await fetch("/api/admin/meta-handoffs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Failed to remove handoff");

      setHandoffs((current) => current.filter((handoff) => handoff.id !== id));
    } catch {
      setError("تعذر تعليم التعليق كتم التعامل معه.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadHandoffs();
    const interval = setInterval(loadHandoffs, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            تعليقات Meta التي تحتاج رد بشري
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            هنا تظهر التعليقات التي وصلت من Facebook لكن الأتمتة لم ترد عليها
            بسبب ضعف التطابق أو سبب تشغيلي آخر.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHandoffs}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-500">بانتظار رد</div>
          <div className="mt-2 text-3xl font-black text-gray-900">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="text-sm font-bold text-amber-700">تطابق ضعيف</div>
          <div className="mt-2 text-3xl font-black text-amber-700">
            {lowConfidenceCount}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm font-bold text-blue-600">
          جاري تحميل التعليقات...
        </div>
      ) : handoffs.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          لا توجد تعليقات تحتاج تدخل بشري الآن.
        </div>
      ) : (
        <div className="grid gap-4">
          {handoffs.map((handoff) => (
            <article
              key={handoff.id}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    <AlertTriangle size={14} />
                    {reasonLabel(handoff.reason)}
                  </div>
                  <p className="text-xs font-bold text-gray-400" dir="ltr">
                    {new Date(handoff.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={facebookFallbackUrl(handoff)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    <ExternalLink size={14} />
                    فتح التعليق
                  </a>
                  <button
                    type="button"
                    onClick={() => markHandled(handoff.id)}
                    disabled={busyId === handoff.id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200"
                  >
                    <CheckCircle2 size={14} />
                    تم الرد
                  </button>
                </div>
              </div>

              <blockquote className="mt-4 rounded-lg border-r-4 border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-800">
                {handoff.messageText || "لا يوجد نص للتعليق."}
              </blockquote>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  Score: {handoff.bestScore ?? "غير مسجل"}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  Products: {handoff.productsCount ?? "غير مسجل"}
                </span>
                {handoff.commentId && (
                  <span className="rounded-full bg-gray-100 px-3 py-1" dir="ltr">
                    {handoff.commentId}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
