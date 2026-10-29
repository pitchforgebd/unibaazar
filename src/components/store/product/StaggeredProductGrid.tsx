import { Stagger, StaggerItem } from "@/components/motion";
import { ProductCard } from "@/components/store/product/ProductCard";
import type { Product } from "@/types/catalog";

/** ProductGrid's layout, with cards revealed one after another on scroll
 * (reduced motion: all fade in together — handled inside Stagger). */
export function StaggeredProductGrid({ products }: { products: Product[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.slug}>
          <ProductCard product={product} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
