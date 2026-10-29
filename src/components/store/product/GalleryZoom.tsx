"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { SlideNav } from "@/components/store/product/SlideNav";
import { useSwipe } from "@/components/store/product/useSwipe";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types/catalog";

type GalleryZoomProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hue: number;
  slides: Array<ProductImage | null>;
  index: number;
  onStep: (delta: number) => void;
};

const CENTER = "50% 50%";

/**
 * Full-screen image viewer on the shared Dialog (focus trap, Escape,
 * backdrop, scroll lock). Swipe or the prev/next buttons (or arrow keys)
 * move between images; tapping toggles a 2x zoom anchored where you tapped,
 * and a mouse pans while zoomed. Swiping is paused while zoomed.
 */
export function GalleryZoom({
  open,
  onOpenChange,
  title,
  hue,
  slides,
  index,
  onStep,
}: GalleryZoomProps) {
  const t = useTranslations("product");
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState(CENTER);
  const step = (delta: number) => {
    setZoomed(false);
    onStep(delta);
  };
  const { handlers, consumeSwipe } = useSwipe({
    onNext: () => step(1),
    onPrev: () => step(-1),
    enabled: !zoomed && slides.length > 1,
  });

  function originFrom(event: MouseEvent<HTMLElement>): string {
    // Keyboard-activated clicks report no pointer position (detail 0).
    if (event.detail === 0) {
      return CENTER;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return `${x}% ${y}%`;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setZoomed(false);
        onOpenChange(next);
      }}
      title={title}
      closeLabel={t("closeZoom")}
      size="lg"
    >
      <div
        className="relative touch-pan-y overflow-hidden rounded-theme"
        aria-roledescription="carousel"
        aria-label={t("zoomed")}
        onKeyDown={onKeyDown}
        {...handlers}
      >
        <button
          type="button"
          className={cn("block w-full", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
          aria-pressed={zoomed}
          aria-label={zoomed ? t("gallery.zoomOut") : t("gallery.zoomIn")}
          onClick={(event) => {
            if (consumeSwipe()) {
              return;
            }
            setOrigin(originFrom(event));
            setZoomed((value) => !value);
          }}
          onMouseMove={(event) => {
            if (zoomed) {
              setOrigin(originFrom(event));
            }
          }}
        >
          <span
            className="block transition-transform duration-base ease-standard motion-reduce:transition-none"
            style={{
              transform: zoomed ? "scale(2)" : undefined,
              transformOrigin: origin,
            }}
          >
            <ProductMedia
              key={slides[index]?.url ?? "placeholder"}
              hue={hue}
              name={title}
              image={slides[index]}
              className="aspect-square text-6xl"
            />
          </span>
        </button>
        <SlideNav index={index} total={slides.length} onStep={step} />
      </div>
    </Dialog>
  );
}
