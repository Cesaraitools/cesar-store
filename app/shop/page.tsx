import ShopPageClient from "./ShopPageClient";
import {
  getActiveCategories,
  getActiveProducts,
} from "@/lib/server/catalog";
import { compactText } from "@/lib/seo";
import { getSeoProductDescriptions } from "@/lib/product-seo-description";
import {
  getProductVariants,
  getVariantDisplayPrice,
  productHasVariants,
} from "@/lib/product-variants";
import type { Product, ProductCardData } from "@/types/product";

type Props = {
  searchParams: { category?: string; search?: string };
};

export const dynamic = "force-dynamic";

function toProductCardData(product: Product): ProductCardData {
  const variants = getProductVariants(product);
  const hasVariants = productHasVariants(product);
  const activeVariants = variants.filter((variant) => variant.active !== false);
  const descriptions = getSeoProductDescriptions(product);
  const variantSearchText = (product.variantOptions || [])
    .flatMap((option) => [
      option.name.ar,
      option.name.en,
      ...option.values.flatMap((value) => [value.label.ar, value.label.en]),
    ])
    .join(" ");
  const hasCompleteVariantStock = activeVariants.every(
    (variant) => typeof variant.stock === "number" && Number.isFinite(variant.stock)
  );
  const variantStock = hasVariants
    ? hasCompleteVariantStock
      ? activeVariants.reduce(
          (total, variant) => total + Math.max(0, Math.floor(variant.stock as number)),
          0
        )
      : null
    : null;
  const availableVariantPrices = activeVariants
    .filter(
      (variant) =>
        (typeof variant.stock !== "number" || variant.stock > 0)
    )
    .map((variant) => getVariantDisplayPrice(product, variant))
    .filter((price) => Number.isFinite(price) && price > 0);
  const effectivePrices = availableVariantPrices.length
    ? availableVariantPrices
    : [product.price];

  return {
    id: product.id,
    name: product.name,
    description: {
      ar: compactText(descriptions.ar, 260),
      en: compactText(descriptions.en, 260),
    },
    price: product.price,
    category: product.category,
    images: product.images.slice(0, 1),
    badge: product.badge,
    stock: product.stock,
    active: product.active,
    low_stock_threshold: product.low_stock_threshold,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    hasVariants,
    variantStock,
    minimumPrice: Math.min(...effectivePrices),
    maximumPrice: Math.max(...effectivePrices),
    searchText: compactText(
      `${product.name.ar} ${product.name.en} ${descriptions.ar} ${descriptions.en} ${variantSearchText}`,
      720
    ),
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const [products, categories] = await Promise.all([
    getActiveProducts(),
    getActiveCategories().catch((error) => {
      console.error("SHOP CATEGORIES ERROR:", error);
      return [];
    }),
  ]);

  return (
    <ShopPageClient
      searchParams={searchParams}
      initialProducts={products.map(toProductCardData)}
      initialCategories={categories}
    />
  );
}
