import { describe, expect, it } from "vitest";
import {
  DIALOG_ENTER_EXIT,
  OVERLAY_FADE,
  REVEAL_DISTANCE,
  TOAST_ENTER_EXIT,
  TOAST_ENTER_EXIT_REDUCED,
  enterExitVariants,
  revealVariants,
  staggerContainerVariants,
} from "./variants";

const TRANSFORM_KEYS = ["x", "y", "scale", "rotate"];

function animatesTransform(target: unknown): boolean {
  if (typeof target !== "object" || target === null) return false;
  return Object.entries(target).some(
    ([key, value]) => TRANSFORM_KEYS.includes(key) && value !== 0 && value !== 1,
  );
}

describe("revealVariants", () => {
  it.each([
    ["up", { x: 0, y: REVEAL_DISTANCE }],
    ["down", { x: 0, y: -REVEAL_DISTANCE }],
    ["left", { x: REVEAL_DISTANCE, y: 0 }],
    ["right", { x: -REVEAL_DISTANCE, y: 0 }],
    ["none", { x: 0, y: 0 }],
  ] as const)("offsets the hidden state for direction %s", (direction, offset) => {
    expect(revealVariants(direction, false).hidden).toEqual({
      opacity: 0,
      visibility: "hidden",
      ...offset,
    });
  });

  it("is fade-only under reduced motion, with instant x/y", () => {
    const variants = revealVariants("up", true);
    expect(variants.hidden).toEqual({ opacity: 0, visibility: "hidden", x: 0, y: 0 });
    expect(variants.visible).toMatchObject({
      transition: { x: { duration: 0 }, y: { duration: 0 } },
    });
  });

  it("makes the visible state visible again, out of the hidden state's visibility:hidden", () => {
    expect(revealVariants("up", false).visible).toMatchObject({ visibility: "visible" });
  });

  it("omits delay unless asked, so a parent stagger's offset isn't overridden", () => {
    expect(revealVariants("up", false).visible).not.toHaveProperty("transition.delay");
    expect(revealVariants("up", false, { delay: 0.3 }).visible).toHaveProperty(
      "transition.delay",
      0.3,
    );
  });
});

describe("staggerContainerVariants", () => {
  it("staggers normally and reveals all at once under reduced motion", () => {
    expect(staggerContainerVariants(false, 0.1).visible).toMatchObject({
      transition: { staggerChildren: 0.1 },
    });
    expect(staggerContainerVariants(true, 0.1).visible).toMatchObject({
      transition: { staggerChildren: 0 },
    });
  });
});

describe("enterExitVariants", () => {
  it("returns the full variants when motion is allowed", () => {
    expect(enterExitVariants("toast", false)).toBe(TOAST_ENTER_EXIT);
    expect(enterExitVariants("dialog", false)).toBe(DIALOG_ENTER_EXIT);
  });

  it.each(["toast", "dialog"] as const)("%s degrades to opacity only", (kind) => {
    const variants = enterExitVariants(kind, true);
    expect([TOAST_ENTER_EXIT_REDUCED, OVERLAY_FADE]).toContain(variants);
    for (const state of Object.values(variants)) {
      expect(animatesTransform(state)).toBe(false);
    }
  });
});
