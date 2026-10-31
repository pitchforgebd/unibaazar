"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CountUp, useFlyToCart } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { ProductGallery } from "@/components/store/product/ProductGallery";
import { ShareButtons } from "@/components/store/product/ShareButtons";
import { StickyBuyBar } from "@/components/store/product/StickyBuyBar";
import { YouTubeEmbed } from "@/components/store/social/YouTubeEmbed";
import { WhatsAppIcon } from "@/components/store/layout/icons";
import { StarRating } from "@/components/store/product/StarRating";
import { VariantSelector } from "@/components/store/product/VariantSelector";
import { discountPercent, productImage, variantPrice } from "@/lib/catalog/pricing";
import { resolveVariant } from "@/lib/catalog/variants";
import { siteConfig } from "@/config/site";
import { formatTaka } from "@/lib/utils/currency";
import { useAddToCart } from "@/hooks/useAddToCart";
import { track } from "@/lib/tracking/browser";
import { RichText } from "@/components/store/product/RichText";
import { useUiStore } from "@/store/ui";
import { useCompareStore, useWishlistStore } from "@/store/lists";
import type { Product } from "@/types/catalog";

type ProductPurchaseProps = {
  product: Product;
  whatsappHref?: string;
  videoUrl?: string;
};

function initialSelection(product: Product): Record<string, string> {
  const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
  return { ...variant.attributes };
}

/** The storefront header's cart button (CartButton). Located by its existing
 * accessible name, which always starts with the localized "Cart" label,
 * rather than by adding a hook to a header file outside this component. */
function headerCartButton(cartLabel: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `header button[aria-label^="${CSS.escape(cartLabel)}"]`,
  );
}

export function ProductPurchase({
  product,
  whatsappHref = siteConfig.chat.whatsapp,
  videoUrl,
}: ProductPurchaseProps) {
  const clip = videoUrl || product.videoUrl || "";
  const router = useRouter();
  const addToCart = useAddToCart();
  const fly = useFlyToCart();
  const openCart = useUiStore((state) => state.openCart);
  const t = useTranslations("product");
  const common = useTranslations("common");
  const wishlist = useWishlistStore((state) => state.slugs);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const compared = useCompareStore((state) => state.slugs);
  const toggleCompare = useCompareStore((state) => state.toggle);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    initialSelection(product),
  );
  const [qty, setQty] = useState(1);
  const activeSlideRef = useRef<HTMLSpanElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const variant = useMemo(() => resolveVariant(product, selected), [product, selected]);
  const saved = wishlist.includes(product.slug);
  const inCompare = compared.includes(product.slug);
  const canBuy = Boolean(variant && variant.stock > 0);
  const price = variant ? variantPrice(variant) : null;

  function choose(name: string, label: string) {
    setSelected((current) => ({ ...current, [name]: label }));
    setQty(1);
  }

  async function buyNow() {
    if (!variant || !canBuy) {
      return;
    }
    const added = await addToCart(
      { slug: product.slug, variantId: variant.id, qty },
      { openDrawer: false },
    );
    if (added) {
      router.push("/checkout");
    }
  }

  // The flight runs alongside the cart write (whose stock check takes about
  // as long), so the add itself is never delayed behind the animation. The
  // drawer opens once the thumbnail has landed, as before.
  async function addAndFly(from: HTMLElement | null) {
    if (!variant || !canBuy) {
      return;
    }
    const target = headerCartButton(common("cart"));
    const img = from?.querySelector("img");
    const flight =
      from && target && img ? fly(from, target, img.currentSrc || img.src) : null;
    const added = await addToCart(
      { slug: product.slug, variantId: variant.id, qty },
      { openDrawer: false },
    );
    await flight;
    if (added) {
      openCart();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProductGallery
        product={product}
        variant={variant}
        onPick={choose}
        activeSlideRef={activeSlideRef}
      />
      <div>
        {product.brandName ? (
          <p className="text-sm text-muted">{product.brandName}</p>
        ) : null}
        <h1 className="mt-1 font-heading text-2xl font-bold text-ink sm:text-3xl">
          {product.name}
        </h1>
        <div className="mt-2">
          <StarRating rating={product.rating} />
        </div>
        <RichText
          safeHtml={product.shortDescription}
          className="mt-3 text-sm leading-6 text-muted"
        />
        <div className="mt-4">
          {variant && price !== null ? (
            <p className="flex flex-wrap items-center gap-2">
              <CountUp
                value={price}
                format={formatTaka}
                className="text-2xl font-semibold text-primary"
              />
              {variant.salePrice !== null && variant.price > price ? (
                <>
                  <span className="text-sm text-muted line-through">
                    {formatTaka(variant.price)}
                  </span>
                  <Badge variant="primary">
                    -{discountPercent(variant.price, price)}%
                  </Badge>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-sm font-semibold text-primary">{t("unavailable")}</p>
          )}
        </div>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">{t("sku")}</dt>
            <dd className="font-medium">{variant?.sku ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t("stock")}</dt>
            <dd className="font-medium">
              {!variant || variant.stock <= 0
                ? t("out")
                : variant.stock <= 5
                  ? t("onlyLeft", { count: variant.stock })
                  : t("inStock", { count: variant.stock })}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <VariantSelector
            attributes={product.attributes}
            selected={selected}
            onSelect={choose}
          />
        </div>

        <div ref={actionsRef} className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            {t("qty")}
            <input
              type="number"
              min={1}
              max={variant?.stock || 1}
              value={qty}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) {
                  return;
                }
                const cap = variant?.stock ?? 1;
                setQty(Math.min(Math.max(1, next), Math.max(cap, 1)));
              }}
              className="h-11 w-20 rounded-theme border border-ink/15 bg-card px-2 text-center"
            />
          </label>
          <Button variant="outline" disabled={!canBuy} onClick={() => void buyNow()}>
            {t("buy")}
          </Button>
          <Button
            disabled={!canBuy}
            onClick={() => void addAndFly(activeSlideRef.current)}
          >
            {t("add")}
          </Button>
        </div>
        <ShareButtons name={product.name} path={`/product/${product.slug}`} />
        {variant ? (
          <a
            className={buttonStyles({
              variant: "outline",
              className: "mt-3 hover:border-whatsapp hover:text-whatsapp",
            })}
            href={`${whatsappHref}${whatsappHref.includes("?") ? "&" : "?"}text=${encodeURIComponent(
              t("purchase.whatsappMessage", { name: product.name, sku: variant.sku }),
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={18} />
            {t("orderWhatsapp")}
          </a>
        ) : null}
        {clip ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-ink">{t("video")}</p>
            <YouTubeEmbed url={clip} title={product.name} />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!saved) {
                track("AddToWishlist", { slug: product.slug });
              }
              toggleWishlist(product.slug);
            }}
          >
            {saved ? t("purchase.removeFromWishlist") : t("purchase.addToWishlist")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleCompare(product.slug)}>
            {inCompare ? t("purchase.removeFromCompare") : t("purchase.addToCompare")}
          </Button>
        </div>
        <div className="mt-5 rounded-theme border border-ink/10 bg-peach p-4 text-sm">
          <p>
            <span className="font-semibold text-ink">{t("purchase.warrantyLabel")}</span>
            {product.warranty}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-ink">{t("purchase.returnsLabel")}</span>
            {product.returns}
          </p>
        </div>
      </div>
      <StickyBuyBar
        anchorRef={actionsRef}
        name={product.name}
        hue={variant?.imageHue ?? product.imageHue}
        image={productImage(product, variant)}
        price={price}
        canBuy={canBuy}
        onAdd={(from) => void addAndFly(from)}
      />
    </div>
  );
}
