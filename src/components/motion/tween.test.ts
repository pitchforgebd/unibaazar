import { describe, expect, it } from "vitest";
import { tweenValue } from "./tween";

describe("tweenValue", () => {
  it("hits both endpoints exactly", () => {
    expect(tweenValue(129900, 149900, 0)).toBe(129900);
    expect(tweenValue(129900, 149900, 1)).toBe(149900);
  });

  it("rounds intermediates to whole units by default (no fractional poisha)", () => {
    expect(tweenValue(0, 10, 0.333)).toBe(3);
    expect(Number.isInteger(tweenValue(1, 1000, 0.4567))).toBe(true);
  });

  it("counts down as well as up", () => {
    expect(tweenValue(10, 0, 0.25)).toBe(8);
  });

  it("keeps the requested decimal places", () => {
    expect(tweenValue(0, 1, 0.12345, 2)).toBe(0.12);
  });

  it("clamps overshooting progress (spring/back easings) to the endpoints", () => {
    expect(tweenValue(0, 100, 1.2)).toBe(100);
    expect(tweenValue(0, 100, -0.1)).toBe(0);
  });

  it("never returns negative zero", () => {
    expect(Object.is(tweenValue(-1, 0, 0.6), -0)).toBe(false);
  });
});
