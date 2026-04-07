import type { Product } from "@/types/product";

export type SortOption =
  | "default"
  | "price-asc"
  | "price-desc"
  | "featured";

export function filterByCategory(
  products: Product[],
  category?: string
) {
  if (!category) return products;
  return products.filter((p) => p.category === category);
}

export function sortProducts(
  products: Product[],
  sort: SortOption
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
      return list;
  }
}