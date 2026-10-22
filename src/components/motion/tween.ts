/**
 * The displayed value at `progress` (0–1, already eased) of a tween from
 * `from` to `to`, rounded to `decimals` places. Rounding happens here rather
 * than in the caller's `format` so money in integer poisha, or a quantity,
 * never flashes a fractional intermediate like "৳1,234.57".
 */
export function tweenValue(
  from: number,
  to: number,
  progress: number,
  decimals = 0,
): number {
  const p = Math.min(1, Math.max(0, progress));
  const raw = from + (to - from) * p;
  const factor = 10 ** decimals;
  const rounded = Math.round(raw * factor) / factor;
  // Math.round(-0.4) is -0, which some formatters render as "-0".
  return Object.is(rounded, -0) ? 0 : rounded;
}
