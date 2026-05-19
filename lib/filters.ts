import type { Product } from "@/types/product";
import { normalizeCategory } from "@/lib/category-normalizer";

export type SortOption =
  | "default"
  | "price-asc"
  | "price-desc"
  | "featured";

const productNameCollator = new Intl.Collator(["ar", "en"], {
  sensitivity: "base",
  numeric: true,
});

export function filterByCategory(
  products: Product[],
  category?: string
) {
  if (!category) return products;
  return products.filter((p) => p.category === category);
}

export function sortProducts(
  products: Product[],
  sort: SortOption,
  categoryOrder?: Map<string, number>
) {
  const list = [...products];

  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);

    case "price-desc":
      return list.sort((a, b) => b.price - a.price);

    case "featured":
      return list.filter(
        (p) => p.badge === "best" || p.badge === "new"
      );

    default:
      return list.sort((a, b) => {
        const categoryRankA =
          categoryOrder?.get(normalizeCategory(a.category)) ?? Number.MAX_SAFE_INTEGER;
        const categoryRankB =
          categoryOrder?.get(normalizeCategory(b.category)) ?? Number.MAX_SAFE_INTEGER;

        if (categoryRankA !== categoryRankB) {
          return categoryRankA - categoryRankB;
        }

        return productNameCollator.compare(
          a.name.ar || a.name.en || "",
          b.name.ar || b.name.en || ""
        );
      });
  }
}
