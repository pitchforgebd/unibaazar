"use client";

import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// The sweep period is a loop rate, not a UI transition, so it deliberately
// isn't one of the DURATION tokens. Colors come from the theme tokens so a
// preset switch re-skins skeletons too.
const SHIMMER_CSS = `
.ub-shimmer{position:relative;overflow:hidden;background-color:rgb(var(--color-ink) / 0.08)}
.ub-shimmer[data-animate="true"]::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgb(var(--color-card) / 0.6),transparent);animation:ub-shimmer 1.4s ease-in-out infinite}
@keyframes ub-shimmer{to{transform:translateX(100%)}}
@media (prefers-reduced-motion: reduce){.ub-shimmer::after{display:none}}`;

type ShimmerProps = {
  /** Size and shape via utilities, e.g. "h-4 w-32 rounded-md". */
  className?: string;
};

/**
 * Loading-skeleton block with a light sweep — the animated, theme-token
 * successor to ui/Skeleton's static pulse. Decorative only: put
 * `aria-busy` on the region that's loading. Reduced motion: a static block.
 */
export function Shimmer({ className }: ShimmerProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      aria-hidden="true"
      className={cn("ub-shimmer rounded-md", className)}
      data-animate={!reduced}
    >
      <style href="ub-motion-shimmer" precedence="default">
        {SHIMMER_CSS}
      </style>
    </div>
  );
}
