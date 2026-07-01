"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageOpen,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import type { WholesaleProductSettingProduct } from "@/types/wholesale";

type Draft = {
  isEnabled: boolean;
  wholesalePrice: string;
  minOrderUnits: string;
  notes: string;
};

type ProductFilter =
  | "all"
  | "enabled"
  | "disabled"
  | "needs_setup"
  | "out_of_stock";

function draftFromProduct(product: WholesaleProductSettingProduct): Draft {
  return {
    isEnabled: product.setting?.isEnabled ?? true,
    wholesalePrice: String(product.setting?.wholesalePrice || ""),
    minOrderUnits: String(product.setting?.minOrderUnits || 1),
    notes: product.setting?.notes || "",
  };
}

function productSearchText(product: WholesaleProductSettingProduct) {
  return [
    product.name.ar,
    product.name.en,
    product.category,
    product.setting?.notes,
  ]
    .join(" ")
    .toLowerCase();
}

function numericDraftValue(value: string, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getProductSetupState(
  product: WholesaleProductSettingProduct,
  draft: Draft
) {
  const wholesalePrice = numericDraftValue(draft.wholesalePrice, 0);
  const minOrderUnits = Math.floor(numericDraftValue(draft.minOrderUnits, 1));
  const isEnabled = draft.isEnabled;
  const missingSetting = !product.setting;
  const missingPrice = isEnabled && wholesalePrice <= 0;
  const invalidMinimum = isEnabled && minOrderUnits <= 0;
  const outOfStock = product.stock <= 0;

  return {
    isEnabled,
    missingSetting,
    missingPrice,
    invalidMinimum,
    outOfStock,
    needsSetup:
      isEnabled && (missingSetting || missingPrice || invalidMinimum || outOfStock),
  };
}

export default function AdminWholesaleProductsPage() {
  const [products, setProducts] = useState<WholesaleProductSettingProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");

  async function loadProducts(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/wholesale/product-settings");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل منتجات الجملة");
      }

      const nextProducts: WholesaleProductSettingProduct[] = Array.isArray(
        payload?.products
      )
        ? payload.products
        : [];
      setProducts(nextProducts);
      setDrafts(
        Object.fromEntries(
          nextProducts.map((product) => [product.id, draftFromProduct(product)])
        )
      );
    } catch {
      setError("فشل تحميل إعدادات منتجات الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProducts(true);
  }, []);

  const productStats = useMemo(() => {
    return products.reduce(
      (stats, product) => {
        const draft = drafts[product.id] || draftFromProduct(product);
        const setup = getProductSetupState(product, draft);

        stats.total += 1;
        if (setup.isEnabled) stats.enabled += 1;
        else stats.disabled += 1;
        if (setup.needsSetup) stats.needsSetup += 1;
        if (setup.outOfStock) stats.outOfStock += 1;

        return stats;
      },
      { total: 0, enabled: 0, disabled: 0, needsSetup: 0, outOfStock: 0 }
    );
  }, [drafts, products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const draft = drafts[product.id] || draftFromProduct(product);
      const setup = getProductSetupState(product, draft);
      const matchesFilter = (() => {
        switch (filter) {
          case "enabled":
            return setup.isEnabled;
          case "disabled":
            return !setup.isEnabled;
          case "needs_setup":
            return setup.needsSetup;
          case "out_of_stock":
            return setup.outOfStock;
          default:
            return true;
        }
      })();

      return (
        matchesFilter &&
        (!normalizedQuery || productSearchText(product).includes(normalizedQuery))
      );
    });
  }, [drafts, filter, products, query]);

  function updateDraft(productId: string, updates: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] || {
          isEnabled: true,
          wholesalePrice: "",
          minOrderUnits: "1",
          notes: "",
        }),
        ...updates,
      },
    }));
  }

  async function saveProduct(product: WholesaleProductSettingProduct) {
    const draft = drafts[product.id] || draftFromProduct(product);

    try {
      setSavingId(product.id);
      setSavedId(null);

      const response = await fetch("/api/admin/wholesale/product-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          isEnabled: draft.isEnabled,
          wholesalePrice: Number(draft.wholesalePrice || 0),
          minOrderUnits: Number(draft.minOrderUnits || 1),
          notes: draft.notes || null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر حفظ إعدادات منتج الجملة");
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, setting: payload.setting } : item
        )
      );
      setSavedId(product.id);
      window.setTimeout(() => setSavedId(null), 1800);
    } catch {
      alert("تعذر حفظ إعدادات الجملة لهذا المنتج");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            إعدادات منتجات الجملة
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            بيانات منفصلة مرتبطة بمنتجات الموقع الحالية. الجملة هنا بسعر القطعة مع حد أدنى للشراء.
          </p>
        </div>
        <button
          onClick={() => loadProducts(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          تحديث
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard label="كل المنتجات" value={productStats.total} />
        <SummaryCard label="مفعلة للجملة" value={productStats.enabled} tone="emerald" />
        <SummaryCard label="غير مفعلة" value={productStats.disabled} tone="slate" />
        <SummaryCard label="تحتاج إعداد" value={productStats.needsSetup} tone="amber" />
        <SummaryCard label="نفد المخزون" value={productStats.outOfStock} tone="rose" />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم المنتج أو القسم أو ملاحظات الجملة"
            className="field-input pr-11"
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as ProductFilter)}
          className="field-input"
        >
          <option value="all">كل المنتجات</option>
          <option value="enabled">مفعلة للجملة</option>
          <option value="disabled">غير مفعلة</option>
          <option value="needs_setup">تحتاج إعداد</option>
          <option value="out_of_stock">نفد المخزون</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-800">
            لا توجد منتجات مطابقة
          </h2>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => {
            const draft = drafts[product.id] || draftFromProduct(product);
            const setup = getProductSetupState(product, draft);
            const isSaving = savingId === product.id;
            const isSaved = savedId === product.id;

            return (
              <article
                key={product.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.85fr)_1.55fr_auto]">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name.ar}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                          بدون صورة
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-950">
                          {product.name.ar}
                        </h2>
                        {setup.needsSetup ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            يحتاج إعداد
                          </span>
                        ) : setup.isEnabled ? (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                            جاهز للجملة
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
                            غير مفعل
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {product.category}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                          قطاعي: {product.retailPrice} جنيه
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                          مخزون: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.isEnabled}
                        onChange={(event) =>
                          updateDraft(product.id, {
                            isEnabled: event.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      متاح للجملة
                    </label>

                    <Field label="سعر جملة القطعة">
                      <input
                        value={draft.wholesalePrice}
                        onChange={(event) =>
                          updateDraft(product.id, {
                            wholesalePrice: event.target.value,
                          })
                        }
                        inputMode="decimal"
                        className="field-input"
                      />
                    </Field>

                    <Field label="أقل كمية شراء بالقطعة">
                      <input
                        value={draft.minOrderUnits}
                        onChange={(event) =>
                          updateDraft(product.id, {
                            minOrderUnits: event.target.value,
                          })
                        }
                        inputMode="numeric"
                        className="field-input"
                      />
                    </Field>

                    <div className="md:col-span-2 xl:col-span-2">
                      <Field label="ملاحظات الجملة">
                        <input
                          value={draft.notes}
                          onChange={(event) =>
                            updateDraft(product.id, { notes: event.target.value })
                          }
                          placeholder="مثال: أقل كمية قابلة للتعديل بعد التواصل"
                          className="field-input"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex items-start justify-end">
                    <button
                      onClick={() => saveProduct(product)}
                      disabled={isSaving}
                      className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-60"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaved ? "تم الحفظ" : "حفظ"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-black opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-black">
        {value.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}
