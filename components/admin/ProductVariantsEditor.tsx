"use client";

import {
  buildVariantKey,
  normalizeProductVariantOptions,
  normalizeProductVariants,
} from "@/lib/product-variants";
import { createSafeUUID } from "@/lib/safe-uuid";
import type { ProductVariant, ProductVariantOption } from "@/types/product";

type Props = {
  options: ProductVariantOption[];
  variants: ProductVariant[];
  onChange: (next: {
    options: ProductVariantOption[];
    variants: ProductVariant[];
  }) => void;
};

function makeId(prefix: string) {
  return `${prefix}-${createSafeUUID().slice(0, 8)}`;
}

function cartesianProduct(
  options: ProductVariantOption[],
  index = 0,
  current: Record<string, string> = {}
): Record<string, string>[] {
  const option = options[index];
  if (!option) return [current];

  return option.values.flatMap((value) =>
    cartesianProduct(options, index + 1, {
      ...current,
      [option.id]: value.id,
    })
  );
}

function optionLabel(
  options: ProductVariantOption[],
  selections: Record<string, string>
) {
  return options
    .map((option) => {
      const value = option.values.find(
        (entry) => entry.id === selections[option.id]
      );
      return `${option.name.ar || option.name.en}: ${
        value?.label.ar || value?.label.en || "-"
      }`;
    })
    .join(" / ");
}

export function ProductVariantsEditor({ options, variants, onChange }: Props) {
  const emit = (
    nextOptions: ProductVariantOption[],
    nextVariants = variants
  ) => {
    onChange({
      options: nextOptions,
      variants: normalizeProductVariants(nextVariants, nextOptions),
    });
  };

  const addOption = () => {
    emit([
      ...options,
      {
        id: makeId("option"),
        name: { ar: "", en: "" },
        values: [],
      },
    ]);
  };

  const updateOption = (
    optionId: string,
    field: "ar" | "en",
    value: string
  ) => {
    emit(
      options.map((option) =>
        option.id === optionId
          ? { ...option, name: { ...option.name, [field]: value } }
          : option
      )
    );
  };

  const addValue = (optionId: string) => {
    emit(
      options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: [
                ...option.values,
                { id: makeId("value"), label: { ar: "", en: "" } },
              ],
            }
          : option
      )
    );
  };

  const updateValue = (
    optionId: string,
    valueId: string,
    field: "ar" | "en",
    value: string
  ) => {
    emit(
      options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((entry) =>
                entry.id === valueId
                  ? { ...entry, label: { ...entry.label, [field]: value } }
                  : entry
              ),
            }
          : option
      )
    );
  };

  const removeOption = (optionId: string) => {
    const nextOptions = options.filter((option) => option.id !== optionId);
    emit(nextOptions, []);
  };

  const removeValue = (optionId: string, valueId: string) => {
    const nextOptions = options.map((option) =>
      option.id === optionId
        ? {
            ...option,
            values: option.values.filter((value) => value.id !== valueId),
          }
        : option
    );
    emit(nextOptions, []);
  };

  const generateVariants = () => {
    const cleanOptions = normalizeProductVariantOptions(options);
    const existingByKey = new Map(variants.map((variant) => [variant.key, variant]));
    const nextVariants = cartesianProduct(cleanOptions).map((selections, index) => {
      const key = buildVariantKey(selections);
      const existing = existingByKey.get(key);

      return (
        existing || {
          id: makeId(`variant-${index + 1}`),
          key,
          selections,
          price: null,
          stock: null,
          image: null,
          active: true,
        }
      );
    });

    onChange({ options: cleanOptions, variants: nextVariants });
  };

  const updateVariant = (
    key: string,
    patch: Partial<Pick<ProductVariant, "price" | "stock" | "image" | "active">>
  ) => {
    onChange({
      options,
      variants: variants.map((variant) =>
        variant.key === key ? { ...variant, ...patch } : variant
      ),
    });
  };

  return (
    <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-gray-900">متغيرات الصنف</h2>
          <p className="text-xs text-gray-500">
            استخدمها للون، المقاس، أو أي معيار يغير اختيار العميل.
          </p>
        </div>
        <button
          type="button"
          onClick={addOption}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold"
        >
          إضافة معيار
        </button>
      </div>

      {options.map((option) => (
        <div key={option.id} className="rounded-xl border bg-white p-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={option.name.ar}
              onChange={(event) =>
                updateOption(option.id, "ar", event.target.value)
              }
              placeholder="اسم المعيار عربي، مثال: اللون"
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              value={option.name.en}
              onChange={(event) =>
                updateOption(option.id, "en", event.target.value)
              }
              placeholder="Option name, e.g. Color"
              className="rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            {option.values.map((value) => (
              <div key={value.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={value.label.ar}
                  onChange={(event) =>
                    updateValue(option.id, value.id, "ar", event.target.value)
                  }
                  placeholder="قيمة عربي، مثال: أحمر"
                  className="rounded border px-3 py-2 text-sm"
                />
                <input
                  value={value.label.en}
                  onChange={(event) =>
                    updateValue(option.id, value.id, "en", event.target.value)
                  }
                  placeholder="Value, e.g. Red"
                  className="rounded border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeValue(option.id, value.id)}
                  className="rounded border px-3 py-2 text-xs font-bold text-red-600"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addValue(option.id)}
              className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold"
            >
              إضافة قيمة
            </button>
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
            >
              حذف المعيار
            </button>
          </div>
        </div>
      ))}

      {!!options.length && (
        <button
          type="button"
          onClick={generateVariants}
          className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white"
        >
          توليد اختيارات الصنف
        </button>
      )}

      {!!variants.length && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="p-2 text-right">الاختيار</th>
                <th className="p-2 text-right">سعر خاص</th>
                <th className="p-2 text-right">مخزون خاص</th>
                <th className="p-2 text-right">صورة خاصة</th>
                <th className="p-2 text-right">نشط</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.key} className="border-t">
                  <td className="p-2 font-bold">{optionLabel(options, variant.selections)}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={
                        typeof variant.price === "number" && variant.price > 0
                          ? variant.price
                          : ""
                      }
                      onChange={(event) =>
                        updateVariant(variant.key, {
                          price:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      placeholder="نفس السعر"
                      className="w-28 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={
                        typeof variant.stock === "number" && variant.stock > 0
                          ? variant.stock
                          : ""
                      }
                      onChange={(event) =>
                        updateVariant(variant.key, {
                          stock:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      placeholder="نفس المخزون"
                      className="w-28 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={variant.image ?? ""}
                      onChange={(event) =>
                        updateVariant(variant.key, { image: event.target.value || null })
                      }
                      placeholder="رابط صورة اختياري"
                      className="w-56 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={variant.active !== false}
                      onChange={(event) =>
                        updateVariant(variant.key, { active: event.target.checked })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
