"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { revealVariants, type RevealDirection } from "./variants";

type RevealProps = {
  children: ReactNode;
  direction?: RevealDirection;
  /** Seconds before the reveal starts once in view. */
  delay?: number;
  /** Fraction of the element that must be visible to trigger (0–1). */
  amount?: number;
  /** Replay every time the element re-enters the viewport. */
  repeat?: boolean;
  className?: string;
};

/**
 * Fades (and, motion permitting, slides) its children in when scrolled into
 * view. This is also the master plan's "scroll reveals" — there is no
 * separate ScrollReveal. Don't wrap the LCP element: it SSRs at opacity 0.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  amount = 0.2,
  repeat = false,
  className,
}: RevealProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      variants={revealVariants(direction, reduced, { delay })}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount }}
    >
      {children}
    </motion.div>
  );
}
