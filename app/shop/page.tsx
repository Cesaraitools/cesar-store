import ShopPageClient from "./ShopPageClient";
import {
  getActiveCategories,
  getActiveProducts,
} from "@/lib/server/catalog";

type Props = {
  searchParams: { category?: string; search?: string };
};

export const dynamic = "force-dynamic";

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
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
