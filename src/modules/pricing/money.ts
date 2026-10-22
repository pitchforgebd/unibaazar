import { Prisma } from "@prisma/client";

/**
 * All money in this module (and everywhere it's consumed) is an integer
 * number of poisha (1 BDT = 100 poisha) — see UNIBAAZAR_V2_MASTER_PLAN.md
 * §5.1. The brand prevents accidentally passing a plain Taka number (or any
 * other unitless int) somewhere a Poisha is expected.
 */
export type Poisha = number & { readonly __poisha: unique symbol };

export const ZERO = 0 as Poisha;

/** Asserts `value` is a safe, non-negative-by-default integer and brands it. */
export function poisha(value: number): Poisha {
  if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new RangeError(`Not a valid poisha amount: ${value}`);
  }
  return value as Poisha;
}

/**
 * Converts a Prisma `Decimal(12,2)` Taka value to Poisha without ever
 * passing through a JS float — Decimal's own arithmetic stays exact, and
 * rounding (half-up) is applied once, at the end, per the master plan's
 * documented rounding rule.
 */
export function fromDecimalTaka(value: Prisma.Decimal): Poisha {
  const rounded = value.times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  return poisha(rounded.toNumber());
}

/** Converts Poisha back to a Taka `Decimal(12,2)` for storage/display. */
export function toDecimalTaka(value: Poisha): Prisma.Decimal {
  return new Prisma.Decimal(value).dividedBy(100).toDecimalPlaces(2);
}

/** For admin inputs that are still plain Taka numbers (e.g. a form field). */
export function fromTakaNumber(taka: number): Poisha {
  return fromDecimalTaka(new Prisma.Decimal(taka));
}

/** For display/logging where a plain Taka number (not Decimal) is wanted. */
export function toTakaNumber(value: Poisha): number {
  return toDecimalTaka(value).toNumber();
}

export function add(...values: Poisha[]): Poisha {
  return poisha(values.reduce((sum, value) => sum + value, 0));
}

export function subtract(a: Poisha, b: Poisha): Poisha {
  return poisha(a - b);
}

export function sum(values: Poisha[]): Poisha {
  return add(...values);
}

export function multiplyByQty(unit: Poisha, qty: number): Poisha {
  if (!Number.isInteger(qty) || qty < 0) {
    throw new RangeError(`Not a valid quantity: ${qty}`);
  }
  return poisha(unit * qty);
}

/** Half-up percentage of an amount, e.g. percentOf(amount, 15) for 15%. */
export function percentOf(amount: Poisha, percent: number): Poisha {
  return poisha(
    new Prisma.Decimal(amount)
      .times(percent)
      .dividedBy(100)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber(),
  );
}

export function clampMin0(value: Poisha): Poisha {
  return value < 0 ? ZERO : value;
}

export function min(a: Poisha, b: Poisha): Poisha {
  return a < b ? a : b;
}

export function max(a: Poisha, b: Poisha): Poisha {
  return a > b ? a : b;
}

export function isNegative(value: Poisha): boolean {
  return value < 0;
}

export function isZero(value: Poisha): boolean {
  return value === 0;
}

export function compare(a: Poisha, b: Poisha): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
