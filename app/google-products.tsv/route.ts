import { getActiveProducts } from "@/lib/server/catalog";
import { getSafeImage } from "@/lib/image-safe";
import { getSeoProductDescription } from "@/lib/product-seo-description";
import { absoluteUrl, getCategorySeo } from "@/lib/seo";
import {
  createVariantSnapshot,
  getProductVariants,
  getVariantDisplayImage,
  getVariantDisplayPrice,
  getVariantDisplayStock,
} from "@/lib/product-variants";

export const dynamic = "force-dynamic";

const HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "price",
  "condition",
  "brand",
  "gtin",
  "identifier_exists",
  "mpn",
  "item_group_id",
  "color",
  "size",
  "scent",
  "product_type",
  "google_product_category",
  "custom_label_0",
];

const MERCHANT_EXCLUDED_PRODUCT_IDS = new Set([
  // Google Merchant may classify this scale truck model as a real public-transport vehicle.
  "8b0b6c0f-082b-4b9f-90fd-c8e1af1419f4",
]);

function cleanCell(value: unknown) {
  return String(value ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickDescription(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  return getSeoProductDescription(product, "ar");
}

function formatPrice(price: number) {
  return `${Number(price || 0).toFixed(2)} EGP`;
}

function isScaleModel(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  const title = `${product.name.ar} ${product.name.en}`.toLowerCase();

  return title.includes("ماكت") || title.includes("model car") || title.includes("scale model");
}

function merchantTitle(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  const title = product.name.ar || product.name.en || `Cesar Store product ${product.id}`;

  if (isScaleModel(product) && !title.includes("مجسم")) {
    return `مجسم ${title}`;
  }

  return title;
}

function googleProductCategory(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  if (isScaleModel(product)) {
    return "Toys & Games > Toys > Toy Vehicles";
  }

  return "Vehicles & Parts > Vehicle Parts & Accessories";
}

function productImages(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  return product.images
    .filter(Boolean)
    .map((image) => absoluteUrl(getSafeImage(image)));
}

function stableVariantId(productId: string, variantKey: string) {
  let hash = 2166136261;

  for (let index = 0; index < variantKey.length; index += 1) {
    hash ^= variantKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${productId}-${(hash >>> 0).toString(36)}`;
}

function variantAttributes(
  product: Awaited<ReturnType<typeof getActiveProducts>>[number],
  selections: Record<string, string>
) {
  const attributes = { color: "", size: "", scent: "" };

  for (const option of product.variantOptions || []) {
    const value = option.values.find((item) => item.id === selections[option.id]);
    if (!value) continue;

    const optionName = `${option.id} ${option.name.ar} ${option.name.en}`.toLowerCase();
    const label = value.label.ar || value.label.en;

    if (optionName.includes("لون") || optionName.includes("color")) {
      attributes.color = label;
    } else if (optionName.includes("مقاس") || optionName.includes("size")) {
      attributes.size = label;
    } else if (
      optionName.includes("عطر") ||
      optionName.includes("رائح") ||
      optionName.includes("scent")
    ) {
      attributes.scent = label;
    }
  }

  return attributes;
}

export async function GET() {
  const products = await getActiveProducts(10000);
  const rows = products
    .filter(
      (product) =>
        product.images[0] &&
        product.price > 0 &&
        !MERCHANT_EXCLUDED_PRODUCT_IDS.has(product.id)
    )
    .flatMap((product) => {
      const baseImages = productImages(product);
      const categorySeo = getCategorySeo(product.category);
      const variants = getProductVariants(product).filter(
        (variant) => variant.active !== false
      );
      const commonTail = [
        categorySeo?.merchantProductType || product.category,
        googleProductCategory(product),
        categorySeo?.titleEn || product.category,
      ];

      if (variants.length > 0) {
        return variants.map((variant) => {
          const snapshot = createVariantSnapshot(
            product.variantOptions || [],
            variant.selections
          );
          const label = snapshot.label_ar || snapshot.label_en;
          const variantImage = absoluteUrl(
            getSafeImage(getVariantDisplayImage(product, variant))
          );
          const images = [
            variantImage,
            ...baseImages.filter((image) => image !== variantImage),
          ];
          const attributes = variantAttributes(product, variant.selections);
          const link = absoluteUrl(
            `/product/${product.id}?variant=${encodeURIComponent(variant.key)}`
          );

          return [
            stableVariantId(product.id, variant.key),
            label ? `${merchantTitle(product)} - ${label}` : merchantTitle(product),
            pickDescription(product),
            link,
            images[0],
            images.slice(1, 11).join(","),
            getVariantDisplayStock(product, variant) > 0
              ? "in_stock"
              : "out_of_stock",
            formatPrice(getVariantDisplayPrice(product, variant)),
            "new",
            product.brand || "",
            "",
            "no",
            "",
            product.id,
            attributes.color,
            attributes.size,
            attributes.scent,
            ...commonTail,
          ];
        });
      }

      const identifierExists = Boolean(
        product.gtin || (product.brand && product.mpn)
      );

      return [
        [
          product.id,
          merchantTitle(product),
          pickDescription(product),
          absoluteUrl(`/product/${product.id}`),
          baseImages[0],
          baseImages.slice(1, 11).join(","),
          "in_stock",
          formatPrice(product.price),
          "new",
          product.brand || "",
          product.gtin || "",
          identifierExists ? "yes" : "no",
          product.mpn || "",
          "",
          "",
          "",
          "",
          ...commonTail,
        ],
      ];
    });

  const body = [HEADERS, ...rows]
    .map((row) => row.map(cleanCell).join("\t"))
    .join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="google-products.tsv"',
      "Content-Type": "text/tab-separated-values; charset=utf-8",
    },
  });
}
