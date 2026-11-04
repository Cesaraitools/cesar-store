"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Facebook,
  Instagram,
  Languages,
  Loader2,
  Play,
  Power,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  buildEvenlySpacedSchedule,
  normalizeDailyRepetitions,
  repeatIntervalMinutes,
} from "@/lib/social-publisher-schedule";

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
  campaign_id: string;
  product_id: string;
  product_ids: string[];
  platform: Platform;
  status: QueueStatus;
  scheduled_for: string;
  product_name: string;
  product_names: string[];
  caption: string;
  image_urls: string[];
  occurrence_index: number;
  occurrence_count: number;
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
  productUrl: string;
  category: string;
  description: string;
};

type Overview = {
  settings: Settings;
  readiness: {
    configured: boolean;
    graphApiVersion: string;
    instagramAuthMode:
      | "unified_login"
      | "instagram_login"
      | "facebook_login"
      | null;
    missing: string[];
  };
  queue: QueueRow[];
  products: Candidate[];
  ai: {
    configured: boolean;
    model: string;
  };
};

type CaptionLanguage = "ar" | "en";
type ArabicTone = "egyptian" | "msa";
type CaptionRelationship =
  | "same_product"
  | "related_products"
  | "different_products";

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

const RELATIONSHIP_LABELS: Record<CaptionRelationship, string> = {
  same_product: "الصور تعبّر عن المنتج نفسه",
  related_products: "الصور لمنتجات مترابطة أو من عائلة واحدة",
  different_products: "الصور لمنتجات مختلفة",
};

function repeatIntervalLabel(repetitions: number) {
  const totalMinutes = repeatIntervalMinutes(repetitions);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (!minutes) return `كل ${hours} ساعة`;
  if (!hours) return `كل ${minutes} دقيقة`;
  return `كل ${hours} ساعة و${minutes} دقيقة تقريبًا`;
}

function cairoDateTime(value: string) {
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SocialPublisherClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [scheduledFor, setScheduledFor] = useState(dateTimeLocalValue());
  const [dailyRepetitions, setDailyRepetitions] = useState(1);
  const [platforms, setPlatforms] = useState<Platform[]>(["facebook", "instagram"]);
  const [queueStatus, setQueueStatus] = useState<"draft" | "queued">("draft");
  const [captionLanguage, setCaptionLanguage] = useState<CaptionLanguage>("ar");
  const [arabicTone, setArabicTone] = useState<ArabicTone>("egyptian");
  const [caption, setCaption] = useState("");
  const [captionRelationship, setCaptionRelationship] =
    useState<CaptionRelationship | null>(null);
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
      setSelectedProductIds((current) =>
        current.filter((id) => payload.products.some((product) => product.id === id))
      );
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

  const selectedProducts = useMemo(() => {
    if (!overview) return [];
    const byId = new Map(overview.products.map((product) => [product.id, product]));
    return selectedProductIds
      .map((id) => byId.get(id))
      .filter(Boolean) as Candidate[];
  }, [overview, selectedProductIds]);

  const filteredProducts = useMemo(() => {
    if (!overview) return [];
    const query = productSearch.trim().toLocaleLowerCase("ar");
    if (!query) return overview.products;

    return overview.products.filter((product) =>
      `${product.name} ${product.category}`.toLocaleLowerCase("ar").includes(query)
    );
  }, [overview, productSearch]);

  const schedulePreview = useMemo(() => {
    try {
      return buildEvenlySpacedSchedule(
        new Date(scheduledFor),
        dailyRepetitions
      );
    } catch {
      return [];
    }
  }, [dailyRepetitions, scheduledFor]);

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

  function toggleProduct(productId: string, checked: boolean) {
    setSelectedProductIds((current) => {
      if (!checked) return current.filter((id) => id !== productId);
      if (current.includes(productId)) return current;
      if (current.length >= 10) {
        setError("يمكن اختيار 10 منتجات كحد أقصى في المنشور الواحد.");
        return current;
      }
      setError("");
      return [...current, productId];
    });
    setCaption("");
    setCaptionRelationship(null);
  }

  async function generateCaption() {
    try {
      setBusy("caption");
      setError("");
      const payload = await request(
        {
          action: "generate_caption",
          productIds: selectedProductIds,
          language: captionLanguage,
          arabicTone,
        },
        "POST"
      );
      setCaption(String(payload.result?.caption || ""));
      setCaptionRelationship(
        (payload.result?.relationship as CaptionRelationship) || null
      );
      setNotice("تم إنشاء النص. راجعه وعدّله قبل إضافة المنشور للطابور.");
    } catch (captionError) {
      setError(
        captionError instanceof Error
          ? captionError.message
          : "تعذر إنشاء نص المنشور."
      );
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
          productIds: selectedProductIds,
          platforms,
          scheduledFor: new Date(scheduledFor).toISOString(),
          dailyRepetitions,
          caption,
          captionLanguage,
          captionTone: arabicTone,
          status: queueStatus,
        },
        "POST"
      );
      setNotice(
        `تمت إضافة الحملة للطابور في ${schedulePreview.length} موعد/مواعيد لكل منصة مختارة.`
      );
      setScheduledFor(dateTimeLocalValue());
      setDailyRepetitions(1);
      setSelectedProductIds([]);
      setCaption("");
      setCaptionRelationship(null);
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

          {overview.settings.instagram_enabled && overview.readiness.instagramAuthMode && (
            <p className="mt-3 text-xs font-bold text-slate-500">
              مسار Instagram: {overview.readiness.instagramAuthMode === "instagram_login"
                ? "رمز Instagram مستقل"
                : overview.readiness.instagramAuthMode === "unified_login"
                  ? "Unified Login (رمز SUAT مستقل)"
                  : "رمز صفحة Facebook المرتبطة"}
            </p>
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
          <h2 className="text-xl font-black text-slate-950">إنشاء منشور متعدد المنتجات</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            اختر حتى 10 منتجات. تُستخدم الصورة الأولى لكل منتج، ويظل النص قابلًا
            للمراجعة والتعديل قبل دخوله إلى الطابور.
          </p>

          <div className="mt-6 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-700">
                  المنتجات المختارة: {selectedProductIds.length}/10
                </span>
                {selectedProductIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductIds([]);
                      setCaption("");
                      setCaptionRelationship(null);
                    }}
                    className="text-xs font-black text-rose-600"
                  >
                    إلغاء الاختيار
                  </button>
                )}
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="ابحث باسم المنتج أو القسم"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-10 text-sm"
                />
              </label>
              <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                {filteredProducts.map((product) => {
                  const checked = selectedProductIds.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 [content-visibility:auto] ${
                        checked
                          ? "border-blue-300 bg-blue-50"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          toggleProduct(product.id, event.target.checked)
                        }
                        className="h-5 w-5 shrink-0"
                      />
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-800">
                          {product.name}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-slate-500">
                          {product.price} ج.م — مخزون {product.stock}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="p-6 text-center text-sm font-bold text-slate-400">
                    لا توجد منتجات مطابقة.
                  </p>
                )}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-black text-blue-700">
                  الصور التي ستُضاف إلى المنشور
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {selectedProducts.map((product, index) => (
                    <div key={product.id} className="w-20 shrink-0 text-center">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-xl border border-blue-100 bg-white object-contain"
                      />
                      <span className="mt-1 block truncate text-[10px] font-bold text-slate-600">
                        {index + 1}. {product.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-black text-slate-700">
                <span className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-blue-600" /> لغة النص
                </span>
                <select
                  value={captionLanguage}
                  onChange={(event) => {
                    setCaptionLanguage(event.target.value as CaptionLanguage);
                    setCaption("");
                    setCaptionRelationship(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
              {captionLanguage === "ar" && (
                <label className="space-y-2 text-sm font-black text-slate-700">
                  <span>أسلوب العربية</span>
                  <select
                    value={arabicTone}
                    onChange={(event) => {
                      setArabicTone(event.target.value as ArabicTone);
                      setCaption("");
                      setCaptionRelationship(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="egyptian">العامية المصرية</option>
                    <option value="msa">العربية الفصحى</option>
                  </select>
                </label>
              )}
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-violet-800">
                    <Sparkles className="h-4 w-4" /> صياغة ChatGPT
                  </p>
                  <p className="mt-1 text-xs font-bold text-violet-600">
                    مسار مستقل عن الردود التلقائية — النموذج: {overview.ai.model}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateCaption}
                  disabled={
                    busy === "caption" ||
                    selectedProductIds.length === 0 ||
                    !overview.ai.configured
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "caption" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {caption ? "إعادة الصياغة" : "إنشاء النص"}
                </button>
              </div>
              {!overview.ai.configured && (
                <p className="mt-3 text-xs font-black text-amber-700">
                  مفتاح OpenAI غير متاح في بيئة التشغيل الحالية، ويمكن كتابة النص يدويًا.
                </p>
              )}
            </div>

            <label className="block space-y-2 text-sm font-black text-slate-700">
              <span>نص المنشور المعتمد</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value.slice(0, 2200))}
                rows={8}
                dir={captionLanguage === "ar" ? "rtl" : "ltr"}
                placeholder="أنشئ النص بالذكاء الاصطناعي أو اكتبه يدويًا هنا..."
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7"
              />
              <span className="flex flex-wrap justify-between gap-2 text-xs font-bold text-slate-400">
                <span>{caption.length}/2200</span>
                {captionRelationship && (
                  <span className="text-violet-600">
                    {RELATIONSHIP_LABELS[captionRelationship]}
                  </span>
                )}
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-black text-slate-700">
                <span>أول موعد للنشر</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="block space-y-2 text-sm font-black text-slate-700">
                <span>مرات النشر خلال دورة 24 ساعة</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={dailyRepetitions}
                  onChange={(event) =>
                    setDailyRepetitions(
                      normalizeDailyRepetitions(Number(event.target.value))
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>

            {schedulePreview.length > 0 && (
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-cyan-800">
                  <Clock3 className="h-4 w-4" /> معاينة المواعيد — {repeatIntervalLabel(dailyRepetitions)}
                </p>
                <ol className="mt-3 grid gap-2 text-xs font-bold text-cyan-900 sm:grid-cols-2">
                  {schedulePreview.map((value, index) => (
                    <li key={value} className="rounded-lg bg-white/80 px-3 py-2">
                      {index + 1}. {cairoDateTime(value)}
                    </li>
                  ))}
                </ol>
              </div>
            )}

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
                <option value="queued">جاهز للنشر في المواعيد</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={createPost}
            disabled={
              busy === "queue" ||
              selectedProductIds.length === 0 ||
              platforms.length === 0 ||
              !caption.trim() ||
              schedulePreview.length === 0
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "queue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إضافة الحملة للطابور
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
                    <h3 className="font-black text-slate-950">
                      {Array.isArray(row.product_names) && row.product_names.length
                        ? row.product_names.join("، ")
                        : row.product_name}
                    </h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(row.status)}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {row.platform === "facebook" ? "Facebook" : "Instagram"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    الموعد: {cairoDateTime(row.scheduled_for)} — المنتجات: {row.product_ids?.length || 1}
                    {row.occurrence_count > 1
                      ? ` — التكرار ${row.occurrence_index + 1} من ${row.occurrence_count}`
                      : ""}
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
