"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/controls";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { PriceBlock } from "@/components/store/product/PriceBlock";
import { ShareButtons } from "@/components/store/product/ShareButtons";
import { YouTubeEmbed } from "@/components/store/social/YouTubeEmbed";
import { WhatsAppIcon } from "@/components/store/layout/icons";
import { StarRating } from "@/components/store/product/StarRating";
import { VariantSelector } from "@/components/store/product/VariantSelector";
import { discountPercent, productImage, variantPrice } from "@/lib/catalog/pricing";
import { resolveVariant } from "@/lib/catalog/variants";
import { siteConfig } from "@/config/site";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useCompareStore, useWishlistStore } from "@/store/lists";
import type { Product, ProductVariant } from "@/types/catalog";

type ProductPurchaseProps = {
  product: Product;
  whatsappHref?: string;
  videoUrl?: string;
};

function initialSelection(product: Product): Record<string, string> {
  const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
  return { ...variant.attributes };
}

export function ProductPurchase({
  product,
  whatsappHref = siteConfig.chat.whatsapp,
  videoUrl,
}: ProductPurchaseProps) {
  const clip = videoUrl || product.videoUrl || "";
  const router = useRouter();
  const addToCart = useAddToCart();
  const t = useTranslations("product");
  const wishlist = useWishlistStore((state) => state.slugs);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const compared = useCompareStore((state) => state.slugs);
  const toggleCompare = useCompareStore((state) => state.toggle);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    initialSelection(product),
  );
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);

  const variant = useMemo(() => resolveVariant(product, selected), [product, selected]);
  const saved = wishlist.includes(product.slug);
  const inCompare = compared.includes(product.slug);

  function choose(name: string, label: string) {
    setSelected((current) => ({ ...current, [name]: label }));
    setQty(1);
  }

  function add(goToCheckout: boolean) {
    if (!variant || variant.stock <= 0) {
      return;
    }
    const added = addToCart(
      { slug: product.slug, variantId: variant.id, qty },
      { openDrawer: !goToCheckout },
    );
    if (added && goToCheckout) {
      router.push("/checkout");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Gallery
        product={product}
        variant={variant}
        zoom={zoom}
        setZoom={setZoom}
        onPick={choose}
      />
      <div>
        {product.brandName ? (
          <p className="text-sm text-muted">{product.brandName}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{product.name}</h1>
        <div className="mt-2">
          <StarRating rating={product.rating} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{product.shortDescription}</p>
        <div className="mt-4">
          {variant ? (
            <PriceBlock
              current={variantPrice(variant)}
              regular={
                variant.salePrice !== null && variant.price > variantPrice(variant)
                  ? variant.price
                  : null
              }
            />
          ) : (
            <p className="text-sm font-semibold text-primary">{t("unavailable")}</p>
          )}
          {variant && variant.salePrice !== null ? (
            <p className="mt-1 text-xs font-semibold text-primary">
              -{discountPercent(variant.price, variantPrice(variant))}%
            </p>
          ) : null}
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
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
              className="h-11 w-20 rounded-md border border-black/10 px-2 text-center"
            />
          </label>
          <button
            type="button"
            className={buttonClass("ink")}
            disabled={!variant || variant.stock <= 0}
            onClick={() => add(true)}
          >
            {t("buy")}
          </button>
          <button
            type="button"
            className={buttonClass("primary")}
            disabled={!variant || variant.stock <= 0}
            onClick={() => add(false)}
          >
            {t("add")}
          </button>
        </div>
        <ShareButtons name={product.name} path={`/product/${product.slug}`} />
        {variant ? (
          <a
            className={`${buttonClass("outline")} mt-3 gap-2 hover:border-whatsapp hover:text-whatsapp`}
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
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <button
            type="button"
            className="text-primary"
            onClick={() => toggleWishlist(product.slug)}
          >
            {saved ? t("purchase.removeFromWishlist") : t("purchase.addToWishlist")}
          </button>
          <button
            type="button"
            className="text-ink"
            onClick={() => toggleCompare(product.slug)}
          >
            {inCompare ? t("purchase.removeFromCompare") : t("purchase.addToCompare")}
          </button>
        </div>
        <div className="mt-5 rounded-lg border border-black/10 bg-peach p-4 text-sm">
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
    </div>
  );
}

function Gallery({
  product,
  variant,
  zoom,
  setZoom,
  onPick,
}: {
  product: Product;
  variant: ProductVariant | null;
  zoom: boolean;
  setZoom: (open: boolean) => void;
  onPick: (name: string, label: string) => void;
}) {
  const t = useTranslations("product");
  const hue = variant?.imageHue ?? product.imageHue;
  const image = productImage(product, variant);

  return (
    <div>
      <button
        type="button"
        className="block w-full overflow-hidden rounded-lg bg-card shadow-soft"
        onClick={() => setZoom(true)}
        aria-label={t("zoom")}
      >
        <ProductMedia
          hue={hue}
          name={product.name}
          image={image}
          loading="eager"
          className="aspect-square transition hover:scale-105"
        />
      </button>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {product.variants.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.sku}
            onClick={() => {
              Object.entries(item.attributes).forEach(([name, label]) =>
                onPick(name, label),
              );
            }}
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
              item.id === variant?.id ? "border-primary" : "border-black/10"
            }`}
          >
            <ProductMedia
              hue={item.imageHue}
              name={product.name}
              image={productImage(product, item)}
              className="h-full w-full text-base"
            />
          </button>
        ))}
      </div>
      {zoom ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("zoomed")}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t("closeZoom")}
            onClick={() => setZoom(false)}
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg">
            <ProductMedia
              hue={hue}
              name={product.name}
              image={image}
              className="aspect-square text-6xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
