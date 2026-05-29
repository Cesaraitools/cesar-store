import type {
  Product,
  ProductVariant,
  ProductVariantOption,
  ProductVariantSnapshot,
} from "@/types/product";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff_-]/gi, "")
    .slice(0, 64);
}

export function buildVariantKey(selections: Record<string, string>) {
  return Object.entries(selections)
    .map(([optionId, valueId]) => [asText(optionId), asText(valueId)] as const)
    .filter(([optionId, valueId]) => optionId && valueId)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, valueId]) => `${optionId}:${valueId}`)
    .join("|");
}

export function normalizeProductVariantOptions(input: unknown): ProductVariantOption[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((option, optionIndex) => {
      const raw = option as Record<string, unknown>;
      const name = raw.name as Record<string, unknown> | undefined;
      const nameAr = asText(name?.ar);
      const nameEn = asText(name?.en) || nameAr;
      const id = asText(raw.id) || slugify(nameEn || nameAr) || `option-${optionIndex + 1}`;
      const valuesInput = Array.isArray(raw.values) ? raw.values : [];

      const values = valuesInput
        .map((value, valueIndex) => {
          const rawValue = value as Record<string, unknown>;
          const label = rawValue.label as Record<string, unknown> | undefined;
          const labelAr = asText(label?.ar);
          const labelEn = asText(label?.en) || labelAr;
          const valueId =
            asText(rawValue.id) ||
            slugify(labelEn || labelAr) ||
            `${id}-value-${valueIndex + 1}`;

          if (!labelAr && !labelEn) return null;

          return {
            id: valueId,
            label: {
              ar: labelAr || labelEn,
              en: labelEn || labelAr,
            },
          };
        })
        .filter(Boolean) as ProductVariantOption["values"];

      if ((!nameAr && !nameEn) || values.length === 0) return null;

      return {
        id,
        name: {
          ar: nameAr || nameEn,
          en: nameEn || nameAr,
        },
        values,
      };
    })
    .filter(Boolean) as ProductVariantOption[];
}

export function normalizeProductVariants(
  input: unknown,
  options: ProductVariantOption[]
): ProductVariant[] {
  if (!Array.isArray(input) || options.length === 0) return [];

  const optionIds = new Set(options.map((option) => option.id));
  const validValuesByOption = new Map(
    options.map((option) => [
      option.id,
      new Set(option.values.map((value) => value.id)),
    ])
  );

  return input
    .map((variant, index): ProductVariant | null => {
      const raw = variant as Record<string, unknown>;
      const rawSelections =
        raw.selections && typeof raw.selections === "object"
          ? (raw.selections as Record<string, unknown>)
          : {};
      const selections: Record<string, string> = {};

      for (const [optionId, valueId] of Object.entries(rawSelections)) {
        const cleanOptionId = asText(optionId);
        const cleanValueId = asText(valueId);
        if (
          optionIds.has(cleanOptionId) &&
          validValuesByOption.get(cleanOptionId)?.has(cleanValueId)
        ) {
          selections[cleanOptionId] = cleanValueId;
        }
      }

      if (Object.keys(selections).length !== options.length) return null;

      const key = asText(raw.key) || buildVariantKey(selections);
      const price = asFiniteNumber(raw.price);
      const stock = asFiniteNumber(raw.stock);
      const image = asText(raw.image);

      return {
        id: asText(raw.id) || `variant-${index + 1}`,
        key,
        selections,
        price: price === null ? null : Math.max(0, price),
        stock: stock === null ? null : Math.max(0, Math.floor(stock)),
        image: image || null,
        active: typeof raw.active === "boolean" ? raw.active : true,
      };
    })
    .filter((variant): variant is ProductVariant => Boolean(variant?.key));
}

type ProductVariantCarrier = Partial<Pick<Product, "variantOptions" | "variants">> & {
  variant_options_json?: unknown;
  variants_json?: unknown;
};

export function getProductVariantOptions(product: ProductVariantCarrier) {
  const rawOptions = product.variantOptions ?? product.variant_options_json;
  return normalizeProductVariantOptions(rawOptions);
}

export function getProductVariants(product: ProductVariantCarrier) {
  const options = getProductVariantOptions(product);
  const rawVariants = product.variants ?? product.variants_json;
  return normalizeProductVariants(rawVariants, options);
}

export function productHasVariants(product: ProductVariantCarrier) {
  return Boolean(getProductVariantOptions(product).length && getProductVariants(product).length);
}

export function findProductVariant(
  product: Pick<Product, "variants">,
  key: string
) {
  return product.variants?.find((variant) => variant.key === key) ?? null;
}

export function getVariantDisplayPrice(product: Product, variant?: ProductVariant | null) {
  return typeof variant?.price === "number" && variant.price > 0
    ? variant.price
    : product.price;
}

export function getVariantDisplayStock(product: Product, variant?: ProductVariant | null) {
  if (typeof variant?.stock === "number" && Number.isFinite(variant.stock)) {
    return Math.max(0, Math.floor(variant.stock));
  }

  return product.stock;
}

export function getVariantDisplayImage(product: Product, variant?: ProductVariant | null) {
  return variant?.image || product.images?.[0] || "/placeholder.png";
}

export function createVariantSnapshot(
  options: ProductVariantOption[],
  selections: Record<string, string>
): ProductVariantSnapshot {
  const selected_options = options
    .map((option) => {
      const valueId = selections[option.id];
      const value = option.values.find((entry) => entry.id === valueId);
      if (!value) return null;

      return {
        option_id: option.id,
        option_name_ar: option.name.ar,
        option_name_en: option.name.en,
        value_id: value.id,
        value_ar: value.label.ar,
        value_en: value.label.en,
      };
    })
    .filter(Boolean) as ProductVariantSnapshot["selected_options"];

  return {
    key: buildVariantKey(selections),
    label_ar: selected_options
      .map((item) => `${item.option_name_ar}: ${item.value_ar}`)
      .join(" - "),
    label_en: selected_options
      .map((item) => `${item.option_name_en}: ${item.value_en}`)
      .join(" - "),
    selected_options,
  };
}

export function formatVariantSnapshot(
  variant: ProductVariantSnapshot | null | undefined,
  lang: "ar" | "en" = "ar"
) {
  if (!variant?.selected_options?.length) return "";
  return lang === "ar" ? variant.label_ar : variant.label_en || variant.label_ar;
}
