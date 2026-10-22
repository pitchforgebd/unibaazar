import { Prisma } from "@prisma/client";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  add,
  clampMin0,
  compare,
  fromDecimalTaka,
  fromTakaNumber,
  multiplyByQty,
  percentOf,
  poisha,
  subtract,
  sum,
  toDecimalTaka,
  toTakaNumber,
  ZERO,
} from "@/modules/pricing/money";

const takaArb = fc.float({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true });
const poishaArb = fc.integer({ min: 0, max: 100_000_00 }).map((value) => poisha(value));

describe("money (poisha)", () => {
  it("rejects non-integer or unsafe values", () => {
    expect(() => poisha(1.5)).toThrow(RangeError);
    expect(() => poisha(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it("round-trips Decimal Taka -> Poisha -> Decimal Taka exactly for 2-decimal values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }).map((cents) => cents / 100),
        (taka) => {
          const decimal = new Prisma.Decimal(taka.toFixed(2));
          const round1 = fromDecimalTaka(decimal);
          const round2 = toDecimalTaka(round1);
          expect(round2.toFixed(2)).toBe(decimal.toFixed(2));
        },
      ),
    );
  });

  it("fromTakaNumber matches fromDecimalTaka for the same value", () => {
    fc.assert(
      fc.property(takaArb, (taka) => {
        const rounded = Math.round(taka * 100) / 100;
        expect(fromTakaNumber(rounded)).toBe(
          fromDecimalTaka(new Prisma.Decimal(rounded)),
        );
      }),
    );
  });

  it("add is associative and commutative", () => {
    fc.assert(
      fc.property(poishaArb, poishaArb, poishaArb, (a, b, c) => {
        expect(add(add(a, b), c)).toBe(add(a, add(b, c)));
        expect(add(a, b)).toBe(add(b, a));
      }),
    );
  });

  it("sum of lines equals the fold of add (invariant the quote engine relies on)", () => {
    fc.assert(
      fc.property(fc.array(poishaArb, { minLength: 0, maxLength: 20 }), (values) => {
        expect(sum(values)).toBe(values.reduce((acc, v) => acc + v, 0));
      }),
    );
  });

  it("subtract then add back is the identity", () => {
    fc.assert(
      fc.property(poishaArb, poishaArb, (a, b) => {
        expect(add(subtract(a, b), b)).toBe(a);
      }),
    );
  });

  it("multiplyByQty matches repeated addition", () => {
    fc.assert(
      fc.property(poishaArb, fc.integer({ min: 0, max: 50 }), (unit, qty) => {
        const repeated = Array.from({ length: qty }, () => unit).reduce(
          (acc, v) => acc + v,
          0,
        );
        expect(multiplyByQty(unit, qty)).toBe(repeated);
      }),
    );
  });

  it("multiplyByQty rejects a negative or fractional quantity", () => {
    expect(() => multiplyByQty(poisha(100), -1)).toThrow(RangeError);
    expect(() => multiplyByQty(poisha(100), 1.5)).toThrow(RangeError);
  });

  it("percentOf never exceeds the amount for 0-100% and is never negative", () => {
    fc.assert(
      fc.property(poishaArb, fc.integer({ min: 0, max: 100 }), (amount, percent) => {
        const discount = percentOf(amount, percent);
        expect(discount).toBeGreaterThanOrEqual(0);
        expect(discount).toBeLessThanOrEqual(amount);
      }),
    );
  });

  it("percentOf(amount, 100) equals amount and percentOf(amount, 0) is zero", () => {
    fc.assert(
      fc.property(poishaArb, (amount) => {
        expect(percentOf(amount, 100)).toBe(amount);
        expect(percentOf(amount, 0)).toBe(ZERO);
      }),
    );
  });

  it("clampMin0 never returns a negative value, and is a no-op for non-negative input", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (raw) => {
        const value = poisha(raw);
        const clamped = clampMin0(value);
        expect(clamped).toBeGreaterThanOrEqual(0);
        if (raw >= 0) {
          expect(clamped).toBe(value);
        }
      }),
    );
  });

  it("compare is consistent with numeric ordering", () => {
    fc.assert(
      fc.property(poishaArb, poishaArb, (a, b) => {
        expect(compare(a, b)).toBe(Math.sign(a - b) as -1 | 0 | 1);
      }),
    );
  });

  it("toTakaNumber(fromTakaNumber(x)) is stable for 2-decimal inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }).map((cents) => cents / 100),
        (taka) => {
          const rounded = Math.round(taka * 100) / 100;
          expect(toTakaNumber(fromTakaNumber(rounded))).toBeCloseTo(rounded, 2);
        },
      ),
    );
  });
});
