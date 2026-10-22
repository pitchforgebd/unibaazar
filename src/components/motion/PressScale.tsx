"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { SPRING } from "./tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export const PRESS_SCALE = 0.97;
export const HOVER_LIFT = -4;

const TAGS = { div: motion.div, span: motion.span };

type PressScaleProps = {
  children: ReactNode;
  /** `span` for inline contexts (e.g. wrapping a button inside text flow). */
  as?: keyof typeof TAGS;
  /** Add the card hover lift on top of the press scale. */
  lift?: boolean;
  scale?: number;
  className?: string;
};

/**
 * Tactile press feedback (scale 0.97) for any button or card it wraps, with
 * an optional hover lift for cards. motion's press gesture is pointer-based,
 * so it covers mouse, pen and touch; its hover gesture ignores touch, so
 * cards don't stick in the lifted state on phones. Reduced motion: none.
 */
export function PressScale({
  children,
  as = "div",
  lift = false,
  scale = PRESS_SCALE,
  className,
}: PressScaleProps) {
  const reduced = usePrefersReducedMotion();
  const Tag = TAGS[as];
  return (
    <Tag
      className={className}
      whileTap={reduced ? undefined : { scale }}
      whileHover={reduced || !lift ? undefined : { y: HOVER_LIFT }}
      transition={SPRING}
    >
      {children}
    </Tag>
  );
}
