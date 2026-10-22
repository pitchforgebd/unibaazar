"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Plain CSS (hoisted and de-duplicated by React 19 via href/precedence)
// rather than motion: an infinite linear loop is exactly what the
// compositor does best, and the reduced-motion and hover/focus pause rules
// then apply from the very first paint, before any JS runs.
const MARQUEE_CSS = `
.ub-marquee{overflow:hidden}
.ub-marquee__track{display:flex;width:max-content;animation:ub-marquee var(--ub-marquee-duration) linear infinite}
.ub-marquee[data-direction="right"] .ub-marquee__track{animation-direction:reverse}
.ub-marquee[data-pausable="true"]:hover .ub-marquee__track,
.ub-marquee[data-pausable="true"]:focus-within .ub-marquee__track{animation-play-state:paused}
.ub-marquee__group{display:flex;flex-shrink:0;align-items:center;gap:var(--ub-marquee-gap);padding-inline-end:var(--ub-marquee-gap)}
@keyframes ub-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){
.ub-marquee{overflow-x:auto}
.ub-marquee__track{animation:none}
.ub-marquee__group[data-clone]{display:none}
}`;

type MarqueeProps = {
  children: ReactNode;
  /** Seconds for one full loop of the content. */
  duration?: number;
  direction?: "left" | "right";
  /** Gap between items, and between the end of the list and its repeat. */
  gap?: string;
  pauseOnHover?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Infinite, slow horizontal strip (the category ribbon). Pauses on hover
 * and while anything inside has keyboard focus. Reduced motion: no
 * auto-scroll — it becomes a plain horizontally scrollable row.
 */
export function Marquee({
  children,
  duration = 40,
  direction = "left",
  gap = "1.5rem",
  pauseOnHover = true,
  className,
  "aria-label": ariaLabel,
}: MarqueeProps) {
  const reduced = usePrefersReducedMotion();
  const style = {
    "--ub-marquee-duration": `${duration}s`,
    "--ub-marquee-gap": gap,
  } as CSSProperties;

  return (
    <div
      className={cn("ub-marquee", className)}
      data-direction={direction}
      data-pausable={pauseOnHover}
      style={style}
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
    >
      <style href="ub-motion-marquee" precedence="default">
        {MARQUEE_CSS}
      </style>
      <div className="ub-marquee__track">
        <div className="ub-marquee__group">{children}</div>
        {!reduced && (
          <div className="ub-marquee__group" data-clone="" aria-hidden="true" inert>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
