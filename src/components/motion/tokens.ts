/**
 * Master plan §4.4's motion tokens, as plain values for the `motion`
 * library's `transition` prop (the CSS-side equivalents — same numbers —
 * live in tailwind.config.ts's transitionDuration/transitionTimingFunction,
 * for components that animate with plain CSS transitions instead).
 *
 * Never hand-write a duration or easing curve in a component under
 * src/components/motion/ (or anywhere animating UI) — import these.
 */
export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  page: 0.45,
} as const;

export const EASING = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.3, 0, 0.1, 1] as const,
};

/** "Motion that feels physical (springs, not linear tweens)" — the master
 * plan's own words. Use this transition for anything that should feel
 * tactile (press states, reveals, the fly-to-cart arc). */
export const SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.9,
};

/** The one place `prefers-reduced-motion` is read — components under
 * src/components/motion/ call this instead of animating unconditionally,
 * so "every animation degrades to a simple fade or none" (master plan
 * §4.4) is enforced in one function rather than repeated per component. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
