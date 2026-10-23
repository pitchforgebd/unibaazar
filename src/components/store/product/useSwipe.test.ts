import { describe, expect, it } from "vitest";
import { SWIPE_THRESHOLD, swipeIntent } from "./useSwipe";

describe("swipeIntent", () => {
  it("treats a leftward drag past the threshold as next", () => {
    expect(swipeIntent(-SWIPE_THRESHOLD, 0)).toBe("next");
  });

  it("treats a rightward drag past the threshold as prev", () => {
    expect(swipeIntent(SWIPE_THRESHOLD + 10, 5)).toBe("prev");
  });

  it("ignores taps and short drags", () => {
    expect(swipeIntent(0, 0)).toBeNull();
    expect(swipeIntent(SWIPE_THRESHOLD - 1, 0)).toBeNull();
  });

  it("ignores mostly-vertical drags so page scrolling still works", () => {
    expect(swipeIntent(-60, 80)).toBeNull();
    expect(swipeIntent(60, -60)).toBeNull();
  });
});
