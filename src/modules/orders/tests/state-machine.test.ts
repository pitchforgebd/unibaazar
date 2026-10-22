import type { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  canTransition,
  holdsStock,
  IllegalTransitionError,
  isTerminal,
} from "@/modules/orders/state-machine";

const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[];
const TERMINAL: OrderStatus[] = ["CANCELLED", "FAILED", "REFUNDED"];
const RELEASED: OrderStatus[] = ["CANCELLED", "FAILED", "RETURNED", "REFUNDED"];

describe("order state machine", () => {
  it("every transition in every status's allow-list is a real, distinct status", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALLOWED_TRANSITIONS[from]) {
        expect(ALL_STATUSES).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });

  it("no status can transition to itself", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("terminal statuses have zero outgoing transitions", () => {
    TERMINAL.forEach((status) => {
      expect(isTerminal(status)).toBe(true);
      expect(ALLOWED_TRANSITIONS[status]).toHaveLength(0);
    });
  });

  it("every non-terminal status has at least one outgoing transition", () => {
    ALL_STATUSES.filter((s) => !TERMINAL.includes(s)).forEach((status) => {
      expect(isTerminal(status)).toBe(false);
      expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
    });
  });

  it("exhaustively matches the declared graph for every (from, to) pair", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const expected = from !== to && ALLOWED_TRANSITIONS[from].includes(to);
        expect(canTransition(from, to)).toBe(expected);
      }
    }
  });

  it("assertTransition throws IllegalTransitionError for a disallowed move", () => {
    expect(() => assertTransition("DELIVERED", "PENDING")).toThrow(
      IllegalTransitionError,
    );
  });

  it("assertTransition does not throw for an allowed move", () => {
    expect(() => assertTransition("PENDING", "CONFIRMED")).not.toThrow();
  });

  // Regressions for the exact bugs ADR 0012's research confirmed: before
  // this state machine existed, setOrderStatus() had zero transition
  // validation, so every one of these was silently permitted.
  describe("regressions — these specific transitions must stay illegal", () => {
    const mustBeIllegal: [OrderStatus, OrderStatus][] = [
      ["DELIVERED", "PENDING"],
      ["COMPLETED", "PENDING"],
      ["CANCELLED", "CONFIRMED"],
      ["CANCELLED", "PENDING"],
      ["PENDING", "COMPLETED"],
      ["PENDING", "DELIVERED"],
      ["FAILED", "PENDING"],
      ["REFUNDED", "CONFIRMED"],
    ];
    mustBeIllegal.forEach(([from, to]) => {
      it(`${from} -> ${to} is illegal`, () => {
        expect(canTransition(from, to)).toBe(false);
      });
    });
  });

  describe("the documented happy path stays legal, step by step", () => {
    const happyPath: OrderStatus[] = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "READY_TO_SHIP",
      "SENT_TO_COURIER",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
    ];
    for (let i = 0; i < happyPath.length - 1; i += 1) {
      const from = happyPath[i]!;
      const to = happyPath[i + 1]!;
      it(`${from} -> ${to} is legal`, () => {
        expect(canTransition(from, to)).toBe(true);
      });
    }
  });

  it("holdsStock is true for every status except the four release statuses", () => {
    ALL_STATUSES.forEach((status) => {
      expect(holdsStock(status)).toBe(!RELEASED.includes(status));
    });
  });

  describe("forward jumps across the pre-shipment pipeline are legal (courier automation skips steps)", () => {
    const skips: [OrderStatus, OrderStatus][] = [
      ["PENDING", "PROCESSING"],
      ["PENDING", "SHIPPED"],
      ["CONFIRMED", "SENT_TO_COURIER"],
      ["PROCESSING", "SHIPPED"],
    ];
    skips.forEach(([from, to]) => {
      it(`${from} -> ${to} is legal`, () => {
        expect(canTransition(from, to)).toBe(true);
      });
    });
  });

  describe("backward jumps across the pre-shipment pipeline stay illegal even after widening it for forward skips", () => {
    const backwards: [OrderStatus, OrderStatus][] = [
      ["SHIPPED", "PENDING"],
      ["SHIPPED", "CONFIRMED"],
      ["SENT_TO_COURIER", "PROCESSING"],
      ["READY_TO_SHIP", "PENDING"],
    ];
    backwards.forEach(([from, to]) => {
      it(`${from} -> ${to} is illegal`, () => {
        expect(canTransition(from, to)).toBe(false);
      });
    });
  });

  // src/modules/orders/server/transition.ts deliberately has no "re-hold"
  // code path — it relies on this invariant staying true. If this test
  // ever fails, transition.ts needs a matching re-hold branch added at the
  // same time, not just a graph edge.
  it("no released status has an edge back into a status that holds stock", () => {
    RELEASED.forEach((from) => {
      ALLOWED_TRANSITIONS[from].forEach((to) => {
        expect(holdsStock(to)).toBe(false);
      });
    });
  });
});
