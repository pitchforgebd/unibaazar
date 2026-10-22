export type RectLike = { left: number; top: number; width: number; height: number };

export type FlightPath = { x: number[]; y: number[]; scale: number[] };

export function isRenderableRect(rect: RectLike): boolean {
  return rect.width > 0 && rect.height > 0;
}

function center(rect: RectLike): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Keyframes for a clone positioned exactly over `from` (transform-origin
 * centre) to travel to `to`'s centre along a quadratic Bézier that bows
 * upward, shrinking to roughly `to`'s size. x/y are translations relative to
 * the clone's starting position, ready for transform keyframes.
 */
export function computeFlightPath(
  from: RectLike,
  to: RectLike,
  { steps = 16, arcHeight }: { steps?: number; arcHeight?: number } = {},
): FlightPath {
  const start = center(from);
  const end = center(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lift = arcHeight ?? clamp(Math.hypot(dx, dy) * 0.3, 60, 240);
  // Control point sits above whichever endpoint is higher, so the path
  // always rises before it falls — the "arc" — whether the cart is above
  // (desktop header) or below (mobile bottom bar) the thumbnail.
  const cx = dx / 2;
  const cy = Math.min(0, dy) - lift;
  const endScale = clamp(
    Math.min(to.width / from.width, to.height / from.height),
    0.1,
    1,
  );

  const path: FlightPath = { x: [], y: [], scale: [] };
  const count = Math.max(2, steps);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const u = 1 - t;
    path.x.push(2 * u * t * cx + t * t * dx);
    path.y.push(2 * u * t * cy + t * t * dy);
    path.scale.push(u + t * endScale);
  }
  return path;
}
