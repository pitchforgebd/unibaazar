"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAnimate } from "motion/react";
import { DURATION } from "./tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export const SHAKE_KEYFRAMES = [0, -6, 6, -4, 4, -2, 0];

type ShakeOnErrorProps = {
  children: ReactNode;
  /**
   * Shakes whenever this changes to a truthy value — pass the field's error
   * message, or a submit counter to re-shake when the same error repeats.
   */
  trigger: unknown;
  className?: string;
};

/** Gentle horizontal shake for inline validation feedback. Reduced motion: none. */
export function ShakeOnError({ children, trigger, className }: ShakeOnErrorProps) {
  const reduced = usePrefersReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const previous = useRef(trigger);

  useEffect(() => {
    const changed = !Object.is(previous.current, trigger);
    previous.current = trigger;
    if (!changed || !trigger || reduced || !scope.current) return;
    const controls = animate(
      scope.current,
      { x: SHAKE_KEYFRAMES },
      { duration: DURATION.slow },
    );
    return () => controls.stop();
  }, [trigger, reduced, animate, scope]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
