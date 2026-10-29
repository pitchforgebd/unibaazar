import type { Transition, Variants } from "motion/react";
import { DURATION, EASING, SPRING } from "./tokens";

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

export const REVEAL_DISTANCE = 16;

function offsetFor(
  direction: RevealDirection,
  distance: number,
): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    case "none":
      return { x: 0, y: 0 };
  }
}

/**
 * `hidden`/`visible` variants shared by Reveal and StaggerItem. Under
 * reduced motion the offset is dropped entirely — and x/y get a zero-length
 * transition — so the only thing that ever animates is opacity, even if the
 * element first mounted (during hydration) with the non-reduced offset.
 */
export function revealVariants(
  direction: RevealDirection,
  reduced: boolean,
  { delay, distance = REVEAL_DISTANCE }: { delay?: number; distance?: number } = {},
): Variants {
  const offset = reduced ? { x: 0, y: 0 } : offsetFor(direction, distance);
  // An explicit delay key (even 0) would override the per-child offset a
  // parent Stagger's `staggerChildren` injects, so only set it when asked.
  const withDelay = delay ? { delay } : {};
  const transition: Transition = reduced
    ? {
        ...withDelay,
        duration: DURATION.base,
        ease: EASING.standard,
        x: { duration: 0 },
        y: { duration: 0 },
      }
    : {
        ...SPRING,
        ...withDelay,
        opacity: { ...withDelay, duration: DURATION.slow, ease: EASING.standard },
      };
  return {
    // `visibility: hidden` alongside opacity: 0 keeps not-yet-revealed
    // content out of the accessibility tree and tab order (otherwise a
    // keyboard user can tab into, and axe's color-contrast check can flag,
    // a card that's merely transparent but still "visible" per the DOM) —
    // see the shop listing grid, the first page long enough to expose this.
    hidden: { opacity: 0, visibility: "hidden", ...offset },
    visible: { opacity: 1, visibility: "visible", x: 0, y: 0, transition },
  };
}

export const STAGGER_STEP = 0.06;

/** Parent variants for Stagger: under reduced motion all children fade together. */
export function staggerContainerVariants(
  reduced: boolean,
  step: number = STAGGER_STEP,
  delay: number = 0,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduced ? 0 : step, delayChildren: delay },
    },
  };
}

/** Enter/exit variants for a toast stack (`initial="initial" animate="animate" exit="exit"`). */
export const TOAST_ENTER_EXIT: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
};

export const TOAST_ENTER_EXIT_REDUCED: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Backdrop fade for any modal surface (Dialog, AlertDialog, drawers). */
export const OVERLAY_FADE: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.base, ease: EASING.standard } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASING.standard } },
};

/** Panel enter/exit for a centred Dialog/AlertDialog — pair with OVERLAY_FADE. */
export const DIALOG_ENTER_EXIT: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: DURATION.fast, ease: EASING.standard },
  },
};

/** Picks the reduced-motion (fade-only) set for any of the enter/exit pairs above. */
export function enterExitVariants(kind: "toast" | "dialog", reduced: boolean): Variants {
  if (reduced) return kind === "toast" ? TOAST_ENTER_EXIT_REDUCED : OVERLAY_FADE;
  return kind === "toast" ? TOAST_ENTER_EXIT : DIALOG_ENTER_EXIT;
}
