import { describe, expect, it } from "vitest";
import { shouldDismissSwipe } from "./swipe";

describe("shouldDismissSwipe", () => {
  it("dismisses a slow drag past 40% of the width, in either direction", () => {
    expect(shouldDismissSwipe(130, 320, 1000)).toBe(true);
    expect(shouldDismissSwipe(-130, 320, 1000)).toBe(true);
  });

  it("snaps back from a slow drag that stops short", () => {
    expect(shouldDismissSwipe(100, 320, 1000)).toBe(false);
  });

  it("dismisses a short but fast flick", () => {
    expect(shouldDismissSwipe(60, 320, 80)).toBe(true);
  });

  it("never dismisses on tiny jitter, however fast", () => {
    expect(shouldDismissSwipe(10, 320, 1)).toBe(false);
  });

  it("is safe with a zero-width (unmeasured) element", () => {
    expect(shouldDismissSwipe(200, 0, 50)).toBe(false);
  });
});
