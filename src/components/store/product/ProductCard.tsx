import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { discountPercent, displayPrice, productImage } from "@/lib/catalog/pricing";
import { PressScale, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { PriceBlock } from "@/components/store/product/PriceBlock";
import { QuickAdd } from "@/components/store/product/QuickAdd";
import { StarRating } from "@/components/store/product/StarRating";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types/catalog";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("product");
  const price = displayPrice(product);
  const discount = price.regular ? discountPercent(price.regular, price.current) : 0;
  const soldOut = product.variants.every((variant) => variant.stock <= 0);

  return (
    <PressScale lift className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-theme bg-card shadow-soft transition-shadow duration-base ease-standard hover:shadow-lg">
        <Link
          href={`/product/${product.slug}`}
          className="relative block overflow-hidden"
        >
          <span className="absolute inset-s-2 top-2 z-10 flex flex-col items-start gap-1">
            {discount > 0 ? <Badge variant="accent">-{discount}%</Badge> : null}
            {product.isNew ? <Badge variant="primary">{t("badgeNew")}</Badge> : null}
          </span>
          {/* Visual only: QuickAdd's own label already says "Out of stock"
           * to assistive tech, so this would just be read twice. A solid
           * ink pill rather than a Badge: every Badge variant but accent
           * (reserved for deals) is translucent, unreadable over a photo. */}
          {soldOut ? (
            <span
              aria-hidden="true"
              className="absolute inset-e-2 top-2 z-10 rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-card"
            >
              {t("out")}
            </span>
          ) : null}
          <ProductMedia
            hue={product.imageHue}
            name={product.name}
            image={productImage(product)}
            className="aspect-square"
            imgClassName={cn(
              "transition-transform duration-slow ease-standard group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              soldOut && "opacity-60",
            )}
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
    </PressScale>
  );
}

const gridClass = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4";

type ProductGridProps = {
  products: Product[];
  /** Stagger the cards in as the grid scrolls into view. */
  reveal?: boolean;
};

export function ProductGrid({ products, reveal = false }: ProductGridProps) {
  if (!reveal) {
    return (
      <div className={gridClass}>
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    );
  }
  return (
    <Stagger className={gridClass} amount={0.05}>
      {products.map((product) => (
        <StaggerItem key={product.slug}>
          <ProductCard product={product} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
