"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LayoutPanelTop, MonitorSmartphone, Grid3X3 } from "lucide-react";
import { getSafeImage } from "@/lib/image-safe";
import type { Product } from "@/types/product";
import {
  createEmptyPromo,
  MANAGED_PROMO_POSITIONS,
  type PromoData,
  type PromoPosition,
} from "@/types/promo";

const BLOCKS: Array<{
  position: PromoPosition;
  title: string;
  subtitle: string;
}> = [
  {
    position: "shop_left",
    title: "Shop Left Block",
    subtitle: "Sticky floating promo rail on the left side of shop products.",
  },
  {
    position: "shop_right",
    title: "Shop Right Block",
    subtitle: "Sticky floating promo rail on the right side of shop products.",
  },
  {
    position: "categories_left",
    title: "Categories Left Block",
    subtitle: "Sticky floating promo rail on the left side of categories.",
  },
  {
    position: "categories_right",
    title: "Categories Right Block",
    subtitle: "Sticky floating promo rail on the right side of categories.",
  },
];

function createPromoState() {
  return {
    shop_left: createEmptyPromo("shop_left"),
    shop_right: createEmptyPromo("shop_right"),
    categories_left: createEmptyPromo("categories_left"),
    categories_right: createEmptyPromo("categories_right"),
  } as Record<PromoPosition, PromoData>;
}

export default function PromosAdminPage() {
  const [promos, setPromos] = useState<Record<PromoPosition, PromoData>>(
    createPromoState()
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/promos").then((response) => response.json()),
      fetch("/api/products").then((response) => response.json()),
    ])
      .then(([promosData, productsData]) => {
        const nextPromos = createPromoState();

        if (Array.isArray(promosData)) {
          for (const promo of promosData) {
            if (MANAGED_PROMO_POSITIONS.includes(promo.position)) {
              nextPromos[promo.position] = {
                ...nextPromos[promo.position],
                ...promo,
                selectedProductIds: Array.isArray(promo.selectedProductIds)
                  ? promo.selectedProductIds
                  : [],
              };
            }
          }
        }

        setPromos(nextPromos);
        setProducts(Array.isArray(productsData) ? productsData : []);
      })
      .catch((loadError) => {
        console.error(loadError);
        setError("Failed to load promos data");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.ar.toLowerCase().includes(normalizedQuery) ||
        product.name.en.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [products, searchQuery]);

  function updatePromo(position: PromoPosition, nextPromo: PromoData) {
    setPromos((prev) => ({
      ...prev,
      [position]: nextPromo,
    }));
  }

  function toggleBlock(position: PromoPosition, checked: boolean) {
    updatePromo(position, {
      ...promos[position],
      isActive: checked,
    });
  }

  function toggleProductSelection(position: PromoPosition, productId: string) {
    const promo = promos[position];
    const isSelected = promo.selectedProductIds.includes(productId);

    updatePromo(position, {
      ...promo,
      selectedProductIds: isSelected
        ? promo.selectedProductIds.filter((id) => id !== productId)
        : [...promo.selectedProductIds, productId],
    });
  }

  async function saveAllPromos() {
    setSaving(true);
    setError(null);

    try {
      for (const position of MANAGED_PROMO_POSITIONS) {
        const promo = promos[position];

        const response = await fetch("/api/promos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...promo,
            id: promo.id || position,
            position,
            selectedProductIds: promo.selectedProductIds,
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.details || payload?.error || `Failed to save ${position}`
          );
        }

        updatePromo(position, {
          ...promos[position],
          ...payload,
        });
      }

      alert("Promotional blocks saved");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save promos"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-10">Loading promo controls...</p>;
  }

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-6" dir="rtl">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              إدارة البلوكات الترويجية
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              اختر أكثر من منتج لكل بلوك. صور واسم ووصف السلايدز سيتم سحبها
              تلقائيًا من بيانات المنتج.
            </p>
          </div>

          <button
            type="button"
            onClick={saveAllPromos}
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ كل البلوكات"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BLOCKS.map((block) => {
          const promo = promos[block.position];
          const isShopBlock = block.position.startsWith("shop");

          return (
            <section
              key={block.position}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    {isShopBlock ? (
                      <MonitorSmartphone size={18} />
                    ) : (
                      <Grid3X3 size={18} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900">
                      {block.title}
                    </h2>
                    <p className="text-xs text-gray-500">{block.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-xs font-bold text-gray-600">
                  المنتجات المختارة
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
                  {promo.selectedProductIds.length}
                </span>
              </div>

              <label className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={promo.isActive}
                  onChange={(e) => toggleBlock(block.position, e.target.checked)}
                />
                تفعيل البلوك
              </label>

              <p className="mt-3 text-xs leading-6 text-gray-500">
                ترتيب السلايدز يتبع ترتيب اختيار المنتجات. أول منتج محدد يظهر
                كأول سلايد.
              </p>
            </section>
          );
        })}
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              اختيار المنتجات داخل البلوكات
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              ضع علامة checkbox بجوار المنتج داخل البلوك المطلوب.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج أو القسم..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pr-11 pl-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-right text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="p-4 font-black text-gray-600">المنتج</th>
                  <th className="p-4 font-black text-gray-600">القسم</th>
                  <th className="p-4 text-center font-black text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <LayoutPanelTop size={16} />
                      <span>Shop Left</span>
                    </div>
                  </th>
                  <th className="p-4 text-center font-black text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <LayoutPanelTop size={16} />
                      <span>Shop Right</span>
                    </div>
                  </th>
                  <th className="p-4 text-center font-black text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <Grid3X3 size={16} />
                      <span>Categories Left</span>
                    </div>
                  </th>
                  <th className="p-4 text-center font-black text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                      <Grid3X3 size={16} />
                      <span>Categories Right</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-blue-50/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getSafeImage(product.images?.[0])}
                          alt={product.name.ar}
                          className="h-14 w-14 rounded-2xl border border-gray-100 bg-gray-100 object-cover"
                        />
                        <div>
                          <p className="font-black text-gray-900">
                            {product.name.ar}
                          </p>
                          <p className="text-xs text-gray-400">
                            {product.name.en || "No EN name"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-gray-600">
                      {product.category}
                    </td>

                    {MANAGED_PROMO_POSITIONS.map((position) => (
                      <td key={`${product.id}-${position}`} className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={promos[position].selectedProductIds.includes(product.id)}
                          onChange={() => toggleProductSelection(position, product.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="p-10 text-center text-sm font-bold text-gray-400">
                لا توجد منتجات مطابقة للبحث الحالي.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
