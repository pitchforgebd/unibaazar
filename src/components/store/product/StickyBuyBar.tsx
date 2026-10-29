"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { formatTaka } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types/catalog";

type StickyBuyBarProps = {
  /** The main purchase panel's action row; the bar shows once it's scrolled past. */
  anchorRef: RefObject<HTMLElement | null>;
  name: string;
  hue: number;
  image: ProductImage | null;
  price: number | null;
  canBuy: boolean;
  onAdd: (from: HTMLElement | null) => void;
};

/**
 * Mobile-only (md:hidden) bar pinned above the bottom MobileNav. While the
 * main Add to cart button is on screen (or not yet reached) the bar is
 * `invisible` + `inert`, so its duplicate button is out of the tab order and
 * the accessibility tree — keyboard and screen-reader users only ever meet
 * one reachable Add to cart at a time.
 */
export function StickyBuyBar({
  anchorRef,
  name,
  hue,
  image,
  price,
  canBuy,
  onAdd,
}: StickyBuyBarProps) {
  const t = useTranslations("product");
  const [shown, setShown] = useState(false);
  const thumbRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-ink/10 bg-card px-4 py-2 shadow-soft md:hidden",
        "transition-[transform,opacity,visibility] duration-base ease-standard motion-reduce:transition-none",
        shown
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-full opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <span ref={thumbRef} className="block shrink-0">
          <ProductMedia
            hue={hue}
            name={name}
            image={image}
            className="size-11 rounded-theme"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          {price !== null ? (
            <CountUp
              value={price}
              format={formatTaka}
              className="text-sm font-semibold text-primary"
            />
          ) : null}
        </div>
        <Button disabled={!canBuy} onClick={() => onAdd(thumbRef.current)}>
          {canBuy ? t("add") : t("out")}
        </Button>
      </div>
    </div>
  );
}
