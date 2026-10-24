import { describe, expect, it } from "vitest";
import { selectAbandonedCarts, type AbandonedCartCandidate } from "./abandoned-cart";

const NOW = new Date("2026-10-24T12:00:00Z");

function cart(overrides: Partial<AbandonedCartCandidate>): AbandonedCartCandidate {
  return {
    id: "cart1",
    updatedAt: new Date("2026-10-24T09:00:00Z"), // 3h old
    email: "customer@example.com",
    name: "Rina",
    lines: [{ name: "Saree", qty: 1 }],
    ...overrides,
  };
}

describe("selectAbandonedCarts", () => {
  it("includes a cart quiet for a few hours with an email on file", () => {
    expect(selectAbandonedCarts([cart({})], NOW)).toHaveLength(1);
  });

  it("excludes a cart still being actively browsed (too fresh)", () => {
    const fresh = cart({ updatedAt: new Date("2026-10-24T11:30:00Z") }); // 30min old
    expect(selectAbandonedCarts([fresh], NOW)).toHaveLength(0);
  });

  it("excludes a cart with no email on file (guest, no account)", () => {
    const guest = cart({ email: null });
    expect(selectAbandonedCarts([guest], NOW)).toHaveLength(0);
  });

  it("excludes a cart abandoned so long ago it's stale noise", () => {
    const stale = cart({ updatedAt: new Date("2026-10-01T00:00:00Z") }); // 23 days old
    expect(selectAbandonedCarts([stale], NOW)).toHaveLength(0);
  });

  it("filters a mixed batch down to just the eligible carts", () => {
    const carts = [
      cart({ id: "a" }),
      cart({ id: "b", email: null }),
      cart({ id: "c", updatedAt: new Date("2026-10-24T11:50:00Z") }),
      cart({ id: "d", updatedAt: new Date("2026-09-01T00:00:00Z") }),
    ];
    expect(selectAbandonedCarts(carts, NOW).map((c) => c.id)).toEqual(["a"]);
  });
});
