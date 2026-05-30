import { getActiveProducts } from "@/lib/server/catalog";
import { getProductVariantOptions, getProductVariants } from "@/lib/product-variants";
import { getSafeImage } from "@/lib/image-safe";
import { SITE_NAME, SITE_URL, absoluteUrl, compactText } from "@/lib/seo";

export const dynamic = "force-dynamic";

function stockStatus(stock: number) {
  if (stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
}

function variantSelections(
  options: ReturnType<typeof getProductVariantOptions>,
  selections: Record<string, string>
) {
  return Object.entries(selections).map(([optionId, valueId]) => {
    const option = options.find((item) => item.id === optionId);
    const value = option?.values.find((item) => item.id === valueId);

    return {
      optionId,
      optionName: option?.name || null,
      valueId,
      valueLabel: value?.label || null,
    };
  });
}

export async function GET() {
  const products = await getActiveProducts(10000);
  const body = {
    schemaVersion: 1,
    source: "cesar-store",
    website: SITE_URL,
    storeName: SITE_NAME,
    language: ["ar-EG", "en"],
    currency: "EGP",
    generatedAt: new Date().toISOString(),
    productsCount: products.length,
    products: products.map((product) => {
      const images = product.images.length
        ? product.images.map((image) => absoluteUrl(getSafeImage(image)))
        : [absoluteUrl(getSafeImage())];
      const options = getProductVariantOptions(product);
      const variants = getProductVariants(product)
        .filter((variant) => variant.active !== false)
        .map((variant) => ({
          id: variant.id,
          key: variant.key,
          selections: variantSelections(options, variant.selections),
          price: variant.price ?? product.price,
          stock: variant.stock ?? product.stock,
          image: variant.image ? absoluteUrl(getSafeImage(variant.image)) : null,
        }));

      return {
        id: product.id,
        name: product.name,
        description: {
          ar: compactText(product.description.ar || product.name.ar, 500),
          en: compactText(product.description.en || product.name.en, 500),
        },
        category: product.category,
        price: product.price,
        currency: "EGP",
        availability: product.stock > 0 ? "in_stock" : "out_of_stock",
        stockStatus: stockStatus(product.stock),
        productUrl: absoluteUrl(`/product/${product.id}`),
        imageUrl: images[0],
        images,
        variantOptions: options,
        variants,
        updatedAt: product.updatedAt,
      };
    }),
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
