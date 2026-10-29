"use client";

import { useState, type Ref } from "react";
import { useTranslations } from "next-intl";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { GalleryZoom } from "@/components/store/product/GalleryZoom";
import { SlideNav } from "@/components/store/product/SlideNav";
import { useSwipe } from "@/components/store/product/useSwipe";
import { productImage } from "@/lib/catalog/pricing";
import { cn } from "@/lib/utils/cn";
import type { Product, ProductImage, ProductVariant } from "@/types/catalog";

/** The selected variant's own image first, then the product's other images. */
export function gallerySlides(
  product: Product,
  variant: ProductVariant | null,
): Array<ProductImage | null> {
  const first = productImage(product, variant);
  if (!first) {
    return [null];
  }
  return [first, ...product.images.filter((image) => image.url !== first.url)];
}

type ProductGalleryProps = {
  product: Product;
  variant: ProductVariant | null;
  onPick: (name: string, label: string) => void;
  /** Attached to the visible slide, so fly-to-cart can start from it. */
  activeSlideRef: Ref<HTMLSpanElement>;
};

export function ProductGallery({
  product,
  variant,
  onPick,
  activeSlideRef,
}: ProductGalleryProps) {
  const t = useTranslations("product");
  const slides = gallerySlides(product, variant);
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [seenVariant, setSeenVariant] = useState(variant?.id);
  if (seenVariant !== variant?.id) {
    setSeenVariant(variant?.id);
    setIndex(0);
  }
  const current = Math.min(index, slides.length - 1);
  const step = (delta: number) =>
    setIndex((value) => (value + delta + slides.length) % slides.length);
  const { handlers, consumeSwipe } = useSwipe({
    onNext: () => step(1),
    onPrev: () => step(-1),
    enabled: slides.length > 1,
  });
  const hue = variant?.imageHue ?? product.imageHue;

  return (
    <div>
      <div
        className="relative touch-pan-y overflow-hidden rounded-theme bg-card shadow-soft"
        aria-roledescription="carousel"
        aria-label={t("gallery.label")}
        {...handlers}
      >
        <div
          className="flex transition-transform duration-slow ease-standard motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((image, slideIndex) => (
            <button
              key={image?.url ?? "placeholder"}
              type="button"
              className="block w-full shrink-0 cursor-zoom-in"
              aria-label={t("zoom")}
              inert={slideIndex !== current}
              onClick={() => {
                if (!consumeSwipe()) {
                  setZoomOpen(true);
                }
              }}
            >
              <span
                className="block"
                ref={slideIndex === current ? activeSlideRef : undefined}
              >
                <ProductMedia
                  hue={hue}
                  name={product.name}
                  image={image}
                  loading={slideIndex === 0 ? "eager" : "lazy"}
                  className="aspect-square"
                />
              </span>
            </button>
          ))}
        </div>
        <SlideNav index={current} total={slides.length} onStep={step} />
      </div>
      {product.variants.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {product.variants.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.sku}
              aria-pressed={item.id === variant?.id}
              onClick={() => {
                Object.entries(item.attributes).forEach(([name, label]) =>
                  onPick(name, label),
                );
              }}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-theme border-2 transition-colors duration-fast ease-standard",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                item.id === variant?.id ? "border-primary" : "border-transparent",
              )}
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
      ) : null}
      <GalleryZoom
        open={zoomOpen}
        onOpenChange={setZoomOpen}
        title={product.name}
        hue={hue}
        slides={slides}
        index={current}
        onStep={step}
      />
    </div>
  );
}
