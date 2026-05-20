import ProductCard from "./ProductCard";
import { Product } from "@/types/product";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
   <div
      className="
        grid
        gap-3 sm:gap-6 lg:gap-8
        justify-center
        grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
      "
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
