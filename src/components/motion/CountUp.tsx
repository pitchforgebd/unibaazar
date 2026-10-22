"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { tweenValue } from "./tween";
import { DURATION, EASING } from "./tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type CountUpProps = {
  value: number;
  /** Turns the (rounded) number into display text — currency, Bengali digits, etc. */
  format?: (value: number) => string;
  /** Decimal places kept during the tween. Default 0 (poisha, quantities). */
  decimals?: number;
  duration?: number;
  className?: string;
};

const defaultFormat = (value: number) => String(value);

/**
 * Animates from the previously shown value to the new `value`. Frames go
 * through a MotionValue (no React render per frame); assistive tech only
 * ever sees the final value via the visually hidden twin. Reduced motion:
 * jumps straight to the new value.
 */
export function CountUp({
  value,
  format = defaultFormat,
  decimals = 0,
  duration = DURATION.slow,
  className,
}: CountUpProps) {
  const reduced = usePrefersReducedMotion();
  const text = useMotionValue(format(value));
  const shown = useRef(value);
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
    text.set(format(shown.current));
  }, [format, text]);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return;
    if (reduced) {
      shown.current = value;
      text.set(formatRef.current(value));
      return;
    }
    const controls = animate(0, 1, {
      duration,
      ease: EASING.standard,
      onUpdate: (progress) => {
        shown.current = tweenValue(from, value, progress, decimals);
        text.set(formatRef.current(shown.current));
      },
    });
    return () => controls.stop();
  }, [value, reduced, decimals, duration, text]);

  return (
    <span className={className}>
      <motion.span aria-hidden="true">{text}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
