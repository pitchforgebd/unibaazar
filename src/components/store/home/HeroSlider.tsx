"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { revealVariants, usePrefersReducedMotion } from "@/components/motion";
import { focusRing } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/utils/cn";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  imageHue: number | null;
};

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // The first slide paints fully visible straight from the server (it's the
  // LCP element — never SSR it at opacity 0); only slides shown after that
  // animate in.
  const [advanced, setAdvanced] = useState(false);
  // Autoplay pauses while the pointer is over the hero or focus is inside
  // it (§4.2), so nobody has the slide swapped out from under them.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setAdvanced(true);
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[Math.min(index, slides.length - 1)];
  const hue = slide.imageHue ?? 24;

  return (
    <div
      className="relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-theme p-6 text-white shadow-soft sm:min-h-80 sm:p-10 lg:min-h-96"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
      style={
        slide.imageUrl
          ? {
              backgroundImage: `url(${slide.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : // 24% lightness, not the more vivid 42% this used to be: at
            // 72% saturation, white text on *any* hue needs lightness
            // this low to clear 4.5:1 — hue 60 (yellow) is the worst
            // case, and still only reaches ~5.8:1 at 24%.
            { backgroundColor: `hsl(${hue} 72% 24%)` }
      }
    >
      {slide.imageUrl ? (
        // Darkest where the copy sits (start edge, at least the old flat
        // black/35 everywhere), easing off toward the far edge.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-black/60 via-black/40 to-black/35 rtl:bg-linear-to-l"
        />
      ) : (
        // Outline-only rings: decorative depth on the flat fallback
        // without lightening the background behind the text.
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <span className="absolute -inset-e-16 -top-16 size-64 rounded-full border-28 border-white/5" />
          <span className="absolute -inset-e-4 -bottom-24 size-48 rounded-full border-18 border-white/5" />
        </div>
      )}
      <motion.div
        key={slide.id}
        variants={revealVariants("up", reduced)}
        initial={advanced ? "hidden" : false}
        animate="visible"
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-white/90 uppercase">
          UniBaazar
        </p>
        <h2 className="mt-3 max-w-xl font-heading text-3xl leading-tight font-bold text-balance sm:text-5xl">
          {slide.title}
        </h2>
        {slide.subtitle ? (
          <p className="mt-3 max-w-md text-sm text-white/90 sm:text-base">
            {slide.subtitle}
          </p>
        ) : null}
        <Link
          href={slide.href}
          className={cn(
            "group mt-6 inline-flex h-12 items-center gap-2 rounded-theme bg-white px-5 text-sm font-semibold text-black",
            "transition-transform duration-fast ease-standard active:scale-97 motion-reduce:active:scale-100",
            focusRing,
            "focus-visible:outline-white",
          )}
        >
          {t("shopNow")}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-base ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180"
          />
        </Link>
      </motion.div>
      {slides.length > 1 ? (
        <div className="mt-6 flex gap-2">
          {slides.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={t("showSlide", { number: itemIndex + 1 })}
              aria-pressed={itemIndex === index}
              onClick={() => {
                setAdvanced(true);
                setIndex(itemIndex);
              }}
              className={cn(
                "grid h-6 min-w-6 place-items-center rounded-full px-1",
                focusRing,
                "focus-visible:outline-white",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-2.5 rounded-full transition-[width,background-color] duration-base ease-standard motion-reduce:transition-none",
                  itemIndex === index ? "w-6 bg-white" : "w-2.5 bg-white/50",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
