import ProductCard from "./ProductCard";
import { Product } from "@/types/product";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div
      className="
        grid
        gap-6
        justify-center
        [grid-template-columns:repeat(auto-fit,minmax(200px,260px))]
      "
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
