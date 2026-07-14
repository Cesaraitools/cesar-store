import { getActiveProducts } from "@/lib/server/catalog";
import { getSafeImage } from "@/lib/image-safe";
import { getSeoProductDescription } from "@/lib/product-seo-description";
import { absoluteUrl, getCategorySeo, SITE_NAME } from "@/lib/seo";

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
  "identifier_exists",
  "mpn",
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

export async function GET() {
  const products = await getActiveProducts(10000);
  const rows = products
    .filter(
      (product) =>
        product.images[0] &&
        product.price > 0 &&
        !MERCHANT_EXCLUDED_PRODUCT_IDS.has(product.id)
    )
    .map((product) => {
      const images = productImages(product);
      const categorySeo = getCategorySeo(product.category);

      return [
        product.id,
        merchantTitle(product),
        pickDescription(product),
        absoluteUrl(`/product/${product.id}`),
        images[0],
        images.slice(1, 11).join(","),
        "in_stock",
        formatPrice(product.price),
        "new",
        SITE_NAME,
        "no",
        product.id,
        categorySeo?.merchantProductType || product.category,
        googleProductCategory(product),
        categorySeo?.titleEn || product.category,
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
