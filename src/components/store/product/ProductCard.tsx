import { Link } from "@/i18n/navigation";
import { discountPercent, displayPrice, productImage } from "@/lib/catalog/pricing";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { PriceBlock } from "@/components/store/product/PriceBlock";
import { QuickAdd } from "@/components/store/product/QuickAdd";
import { StarRating } from "@/components/store/product/StarRating";
import type { Product } from "@/types/catalog";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const price = displayPrice(product);
  const discount = price.regular ? discountPercent(price.regular, price.current) : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg bg-card shadow-soft transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <Link href={`/product/${product.slug}`} className="relative block overflow-hidden">
        {discount > 0 ? (
          <span className="absolute top-2 left-2 z-10 rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">
            -{discount}%
          </span>
        ) : null}
        <ProductMedia
          hue={product.imageHue}
          name={product.name}
          image={productImage(product)}
          className="aspect-square"
          imgClassName="transition-transform duration-300 ease-out group-hover:scale-110"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3">
        {product.brandName ? (
          <p className="text-xs text-muted">{product.brandName}</p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
          <Link href={`/product/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <div className="mt-2">
          <PriceBlock current={price.current} regular={price.regular} />
        </div>
        <div className="mt-1">
          <StarRating rating={product.rating} />
        </div>
        <div className="mt-auto">
          <QuickAdd product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
