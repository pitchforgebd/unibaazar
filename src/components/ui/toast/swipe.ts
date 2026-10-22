/** Fraction of the toast's width a slow drag must cover to dismiss it. */
export const SWIPE_DISTANCE_RATIO = 0.4;
/** px/ms — a quick flick dismisses even if it's short. */
export const SWIPE_FLICK_VELOCITY = 0.5;
/** Below this, movement is treated as a tap/jitter, never a dismissal. */
export const SWIPE_MIN_DISTANCE_PX = 24;

export function shouldDismissSwipe(
  deltaX: number,
  width: number,
  elapsedMs: number,
): boolean {
  const distance = Math.abs(deltaX);
  if (width <= 0 || distance < SWIPE_MIN_DISTANCE_PX) {
    return false;
  }
  if (distance >= width * SWIPE_DISTANCE_RATIO) {
    return true;
  }
  return distance / Math.max(elapsedMs, 1) >= SWIPE_FLICK_VELOCITY;
}
