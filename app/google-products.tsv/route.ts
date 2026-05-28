import { getActiveProducts } from "@/lib/server/catalog";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

const HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "availability",
  "price",
  "condition",
  "brand",
  "identifier_exists",
  "mpn",
  "product_type",
];

function cleanCell(value: unknown) {
  return String(value ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickDescription(product: Awaited<ReturnType<typeof getActiveProducts>>[number]) {
  const description =
    product.description.ar || product.description.en || product.name.ar || product.name.en;

  return description || "منتج من متجر سيزر لمنتجات وإكسسوارات السيارات.";
}

function formatPrice(price: number) {
  return `${Number(price || 0).toFixed(2)} EGP`;
}

export async function GET() {
  const products = await getActiveProducts(10000);
  const rows = products
    .filter((product) => product.images[0] && product.price > 0)
    .map((product) => [
      product.id,
      product.name.ar || product.name.en || `Cesar Store product ${product.id}`,
      pickDescription(product),
      absoluteUrl(`/product/${product.id}`),
      absoluteUrl(product.images[0]),
      "in_stock",
      formatPrice(product.price),
      "new",
      SITE_NAME,
      "no",
      product.id,
      product.category,
    ]);

  const body = [HEADERS, ...rows]
    .map((row) => row.map(cleanCell).join("\t"))
    .join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Disposition": 'inline; filename="google-products.tsv"',
      "Content-Type": "text/tab-separated-values; charset=utf-8",
    },
  });
}
