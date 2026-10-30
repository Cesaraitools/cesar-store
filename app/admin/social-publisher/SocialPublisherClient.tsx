"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Instagram,
  Loader2,
  Play,
  Power,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Platform = "facebook" | "instagram";
type QueueStatus =
  | "draft"
  | "queued"
  | "processing"
  | "published"
  | "failed"
  | "cancelled"
  | "skipped";

type Settings = {
  enabled: boolean;
  mode: "draft" | "live";
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  auto_queue_enabled: boolean;
  min_stock: number;
  repeat_cooldown_days: number;
  daily_post_limit: number;
  posting_times: string[];
};

type QueueRow = {
  id: string;
  product_id: string;
  platform: Platform;
  status: QueueStatus;
  scheduled_for: string;
  product_name: string;
  price_snapshot: number | string;
  stock_snapshot: number;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  external_post_url: string | null;
  created_at: string;
};

type Candidate = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
};

type Overview = {
  settings: Settings;
  readiness: { configured: boolean; graphApiVersion: string; missing: string[] };
  queue: QueueRow[];
  products: Candidate[];
};

const STATUS_LABELS: Record<QueueStatus, string> = {
  draft: "مسودة",
  queued: "في الانتظار",
  processing: "جارٍ النشر",
  published: "تم النشر",
  failed: "فشل",
  cancelled: "ملغي",
  skipped: "تم التخطي",
};

const SETTING_TOGGLES: Array<{
  key:
    | "enabled"
    | "auto_queue_enabled"
    | "facebook_enabled"
    | "instagram_enabled";
  label: string;
  Icon: LucideIcon;
}> = [
  { key: "enabled", label: "تشغيل النظام", Icon: Power },
  { key: "auto_queue_enabled", label: "الاختيار التلقائي", Icon: RefreshCw },
  { key: "facebook_enabled", label: "Facebook", Icon: Facebook },
  { key: "instagram_enabled", label: "Instagram", Icon: Instagram },
];

function dateTimeLocalValue(offsetMinutes = 60) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
function statusClass(status: QueueStatus) {
  if (status === "published") return "bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "skipped") return "bg-rose-50 text-rose-700";
  if (status === "queued" || status === "processing") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

export default function SocialPublisherClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [productId, setProductId] = useState("");
  const [scheduledFor, setScheduledFor] = useState(dateTimeLocalValue());
  const [platforms, setPlatforms] = useState<Platform[]>(["facebook", "instagram"]);
  const [queueStatus, setQueueStatus] = useState<"draft" | "queued">("draft");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (body?: Record<string, unknown>, method = "GET") => {
    const response = await fetch("/api/admin/social-publisher", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.error || "تعذر تنفيذ العملية.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    try {
      setError("");
      const payload = (await request()) as Overview;
      setOverview(payload);
      setSettings(payload.settings);
      setProductId((current) => current || payload.products[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات.");
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const queue = overview?.queue || [];
    return {
      drafts: queue.filter((row) => row.status === "draft").length,
      pending: queue.filter((row) => ["queued", "processing"].includes(row.status)).length,
      published: queue.filter((row) => row.status === "published").length,
      failed: queue.filter((row) => ["failed", "skipped"].includes(row.status)).length,
    };
  }, [overview]);

  async function saveSettings() {
    if (!settings) return;

    try {
      setBusy("settings");
      setError("");
      await request(settings as unknown as Record<string, unknown>, "PUT");
      setNotice("تم حفظ إعدادات النشر.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ الإعدادات.");
    } finally {
      setBusy("");
    }
  }

  async function createPost() {
    try {
      setBusy("queue");
      setError("");
      await request(
        {
          action: "queue",
          productId,
          platforms,
          scheduledFor: new Date(scheduledFor).toISOString(),
          status: queueStatus,
        },
        "POST"
      );
      setNotice("تمت إضافة المنشور للطابور.");
      setScheduledFor(dateTimeLocalValue());
      await load();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "تعذر إضافة المنشور.");
    } finally {
      setBusy("");
    }
  }

  async function runAction(action: string, queueId?: string) {
    try {
      setBusy(queueId ? `${action}:${queueId}` : action);
      setError("");
      const payload = await request({ action, queueId }, "POST");
      if (action === "run") {
        setNotice("اكتملت دورة التشغيل.");
      } else if (action === "test_connection") {
        const facebookName = payload.result?.facebook?.name;
        const instagramUsername = payload.result?.instagram?.username;
        setNotice(
          `تم التحقق من اتصال Meta بنجاح${
            facebookName ? ` — Facebook: ${facebookName}` : ""
          }${instagramUsername ? ` — Instagram: @${instagramUsername}` : ""}`
        );
      } else {
        setNotice("تم تحديث المنشور.");
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذر تنفيذ الإجراء.");
    } finally {
      setBusy("");
    }
  }

  if (!overview || !settings) {
    return (
      <div className="flex min-h-64 items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mr-3 font-bold text-slate-600">جاري تحميل مركز النشر...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-blue-700">
            <Send className="h-5 w-5" />
            Cesar Social Publisher
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">مركز النشر التلقائي</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
            نظام مستقل عن Cesar Response يقرأ بيانات المنتجات فقط، ويتحقق من السعر
            والمخزون قبل النشر، ويسجل كل محاولة ويمنع تكرار المنشورات.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            type="button"
            onClick={() => runAction("run")}
            disabled={busy === "run"}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            تشغيل دورة الآن
          </button>
          <button
            type="button"
            onClick={() => runAction("test_connection")}
            disabled={busy === "test_connection" || !overview.readiness.configured}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "test_connection" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            اختبار اتصال Meta
          </button>
        </div>
      </section>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
          <AlertTriangle className="h-5 w-5" /> {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["المسودات", counts.drafts, "text-slate-900"],
          ["في الانتظار", counts.pending, "text-blue-700"],
          ["تم النشر", counts.published, "text-emerald-700"],
          ["تحتاج مراجعة", counts.failed, "text-rose-700"],
        ].map(([label, value, className]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-slate-400">{label}</p>
            <p className={`mt-2 text-3xl font-black ${className}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">الإعدادات والحماية</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                التوقيت حسب القاهرة، والنظام لا ينشر في وضع المسودة.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${overview.readiness.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {overview.readiness.configured ? "Meta متصل" : "Meta يحتاج إعداد"}
            </span>
          </div>

          {!overview.readiness.configured && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-800" dir="ltr">
              Missing: {overview.readiness.missing.join(", ")}
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>وضع التشغيل</span>
              <select
                value={settings.mode}
                onChange={(event) => setSettings({ ...settings, mode: event.target.value as "draft" | "live" })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="draft">مسودة آمنة</option>
                <option value="live">نشر حي</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>مواعيد النشر (HH:MM)</span>
              <input
                value={settings.posting_times.join(", ")}
                onChange={(event) => setSettings({ ...settings, posting_times: event.target.value.split(",").map((value) => value.trim()) })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left"
                dir="ltr"
              />
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>الحد الأدنى للمخزون</span>
              <input
                type="number"
                min={0}
                value={settings.min_stock}
                onChange={(event) => setSettings({ ...settings, min_stock: Number(event.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>منع تكرار المنتج (يوم)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.repeat_cooldown_days}
                onChange={(event) => setSettings({ ...settings, repeat_cooldown_days: Number(event.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-sm font-black text-slate-700">
              <span>الحد الأقصى اليومي</span>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.daily_post_limit}
                onChange={(event) => setSettings({ ...settings, daily_post_limit: Number(event.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {SETTING_TOGGLES.map(({ key, label, Icon }) => (
              <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">
                <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                  <Icon className="h-4 w-4 text-blue-600" /> {label}
                </span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })}
                  className="h-5 w-5"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={busy === "settings"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === "settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ الإعدادات
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">إضافة منشور يدوي للطابور</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            النص يُنشأ من بيانات المنتج المسجلة، ويُراجع السعر والمخزون مرة أخرى قبل النشر.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm font-black text-slate-700">
              <span>المنتج</span>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3">
                {overview.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.price} ج.م — مخزون {product.stock}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-black text-slate-700">
              <span>موعد النشر</span>
              <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["facebook", "instagram"] as Platform[]).map((platform) => (
                <label key={platform} className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={(event) => setPlatforms((current) => event.target.checked ? [...new Set([...current, platform])] : current.filter((item) => item !== platform))}
                    className="h-5 w-5"
                  />
                  {platform === "facebook" ? "Facebook" : "Instagram"}
                </label>
              ))}
            </div>
            <label className="block space-y-2 text-sm font-black text-slate-700">
              <span>حالة الإضافة</span>
              <select value={queueStatus} onChange={(event) => setQueueStatus(event.target.value as "draft" | "queued")} className="w-full rounded-xl border border-slate-200 px-4 py-3">
                <option value="draft">مسودة للمراجعة</option>
                <option value="queued">جاهز للنشر في الموعد</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={createPost}
            disabled={busy === "queue" || !productId || platforms.length === 0}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === "queue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إضافة للطابور
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black text-slate-950">آخر المنشورات والمحاولات</h2>
        </div>
        {overview.queue.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-slate-400">لا توجد منشورات في الطابور بعد.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {overview.queue.map((row) => (
              <article key={row.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{row.product_name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(row.status)}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {row.platform === "facebook" ? "Facebook" : "Instagram"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    الموعد: {new Date(row.scheduled_for).toLocaleString("ar-EG")} — السعر: {Number(row.price_snapshot)} ج.م — المخزون: {row.stock_snapshot}
                  </p>
                  {row.last_error && <p className="mt-2 text-xs font-bold text-rose-600" dir="ltr">{row.last_error}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status === "draft" && (
                    <button onClick={() => runAction("approve", row.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">اعتماد</button>
                  )}
                  {["draft", "queued", "failed"].includes(row.status) && (
                    <button onClick={() => runAction("cancel", row.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                      <XCircle className="h-3.5 w-3.5" /> إلغاء
                    </button>
                  )}
                  {["failed", "skipped"].includes(row.status) && (
                    <button onClick={() => runAction("retry", row.id)} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">إعادة المحاولة</button>
                  )}
                  {row.external_post_url && (
                    <a href={row.external_post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                      <ExternalLink className="h-3.5 w-3.5" /> فتح المنشور
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
