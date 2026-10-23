"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";

type SlideNavProps = {
  index: number;
  total: number;
  onStep: (delta: number) => void;
};

const navClass = "absolute top-1/2 -translate-y-1/2 bg-card/90 shadow-soft";

/** Visible prev/next buttons plus a position readout — the non-gesture
 * fallback for swiping between gallery images. Renders nothing for one image. */
export function SlideNav({ index, total, onStep }: SlideNavProps) {
  const t = useTranslations("product.gallery");
  if (total < 2) {
    return null;
  }
  return (
    <>
      <IconButton
        aria-label={t("previous")}
        size="sm"
        className={cn(navClass, "left-2")}
        onClick={() => onStep(-1)}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </IconButton>
      <IconButton
        aria-label={t("next")}
        size="sm"
        className={cn(navClass, "right-2")}
        onClick={() => onStep(1)}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </IconButton>
      <p
        aria-live="polite"
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-semibold text-ink shadow-soft"
      >
        {t("position", { current: index + 1, total })}
      </p>
    </>
  );
}
