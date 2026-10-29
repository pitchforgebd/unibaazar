"use client";

import { useRef, type TouchEvent } from "react";

export type SwipeIntent = "next" | "prev" | null;

/** Minimum horizontal travel (px) before a touch counts as a swipe. */
export const SWIPE_THRESHOLD = 40;

/**
 * Classifies a finished touch: a mostly-horizontal drag past the threshold
 * is a swipe (leftward = next image), anything else — a tap, or a vertical
 * scroll — is not.
 */
export function swipeIntent(
  dx: number,
  dy: number,
  threshold = SWIPE_THRESHOLD,
): SwipeIntent {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }
  return dx < 0 ? "next" : "prev";
}

type UseSwipeOptions = {
  onNext: () => void;
  onPrev: () => void;
  enabled?: boolean;
};

/**
 * Touch-swipe handlers for a carousel. `consumeSwipe()` lets a click handler
 * on the same surface ignore the click some browsers still fire after a swipe.
 */
export function useSwipe({ onNext, onPrev, enabled = true }: UseSwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const handlers = {
    onTouchStart(event: TouchEvent) {
      swiped.current = false;
      const touch = event.touches[0];
      start.current = enabled && touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd(event: TouchEvent) {
      const origin = start.current;
      const touch = event.changedTouches[0];
      start.current = null;
      if (!origin || !touch) {
        return;
      }
      const intent = swipeIntent(touch.clientX - origin.x, touch.clientY - origin.y);
      if (intent) {
        swiped.current = true;
        (intent === "next" ? onNext : onPrev)();
      }
    },
    onTouchCancel() {
      start.current = null;
    },
  };

  function consumeSwipe(): boolean {
    const was = swiped.current;
    swiped.current = false;
    return was;
  }

  return { handlers, consumeSwipe };
}
