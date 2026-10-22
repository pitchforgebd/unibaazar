import { describe, expect, it } from "vitest";
import { computeFlightPath, isRenderableRect } from "./flightPath";

const thumb = { left: 100, top: 500, width: 200, height: 200 }; // centre (200, 600)
const cartIcon = { left: 900, top: 20, width: 24, height: 24 }; // centre (912, 32)

describe("computeFlightPath", () => {
  it("starts at the origin and ends exactly on the target's centre", () => {
    const path = computeFlightPath(thumb, cartIcon);
    expect(path.x[0]).toBeCloseTo(0);
    expect(path.y[0]).toBeCloseTo(0);
    expect(path.x.at(-1)).toBeCloseTo(712);
    expect(path.y.at(-1)).toBeCloseTo(-568);
  });

  it("shrinks from full size to roughly the target's size", () => {
    const path = computeFlightPath(thumb, cartIcon);
    expect(path.scale[0]).toBe(1);
    expect(path.scale.at(-1)).toBeCloseTo(0.12);
  });

  it("arcs above both endpoints when the cart is above the thumbnail", () => {
    const path = computeFlightPath(thumb, cartIcon, { arcHeight: 100 });
    expect(Math.min(...path.y)).toBeLessThan(-568);
  });

  it("still rises first when the cart is below (mobile bottom bar)", () => {
    const bottomBar = { left: 150, top: 900, width: 40, height: 40 };
    const path = computeFlightPath(thumb, bottomBar, { arcHeight: 100 });
    expect(path.y[1]).toBeLessThan(0);
    expect(path.y.at(-1)).toBeCloseTo(320);
  });

  it("never scales up and never collapses to zero", () => {
    const big = { left: 0, top: 0, width: 800, height: 800 };
    const tiny = { left: 0, top: 0, width: 1, height: 1 };
    expect(computeFlightPath(thumb, big).scale.at(-1)).toBe(1);
    expect(computeFlightPath(thumb, tiny).scale.at(-1)).toBe(0.1);
  });

  it("emits the requested number of keyframes, with at least two", () => {
    expect(computeFlightPath(thumb, cartIcon, { steps: 8 }).x).toHaveLength(8);
    expect(computeFlightPath(thumb, cartIcon, { steps: 0 }).x).toHaveLength(2);
  });
});

describe("isRenderableRect", () => {
  it("rejects zero-size rects (display:none / collapsed header)", () => {
    expect(isRenderableRect({ left: 10, top: 10, width: 0, height: 0 })).toBe(false);
    expect(isRenderableRect(cartIcon)).toBe(true);
  });
});
