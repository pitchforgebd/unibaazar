"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate } from "motion/react";
import { computeFlightPath, isRenderableRect } from "./flightPath";
import { DURATION, EASING, prefersReducedMotion } from "./tokens";

export type FlyToCartOptions = {
  /** Bump `to` (scale pop) once the clone lands. Default true. */
  bump?: boolean;
  signal?: AbortSignal;
};

function createClone(rect: DOMRect, imageUrl: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    objectFit: "cover",
    borderRadius: "var(--radius-theme, 10px)",
    pointerEvents: "none",
    zIndex: "9999",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  return img;
}

function bumpTarget(to: HTMLElement, reduced: boolean): void {
  if (reduced) {
    animate(to, { opacity: [1, 0.5, 1] }, { duration: DURATION.slow });
    return;
  }
  animate(
    to,
    { scale: [1, 1.25, 0.94, 1] },
    { duration: DURATION.slow, ease: "easeOut" },
  );
}

/**
 * Flies a fixed-position clone of `imageUrl` from `from`'s on-screen rect to
 * `to`'s, then bumps `to`. Positions are read with getBoundingClientRect at
 * call time, so the two elements can live anywhere in the tree. Resolves when
 * the clone lands (callers update the cart count then, so the number changes
 * as the bump plays). Reduced motion, or a hidden target (e.g. a collapsed
 * mobile header): no flight, just the fade-pulse/bump.
 */
export async function flyToCart(
  from: HTMLElement,
  to: HTMLElement,
  imageUrl: string,
  { bump = true, signal }: FlyToCartOptions = {},
): Promise<void> {
  const reduced = prefersReducedMotion();
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  if (
    !reduced &&
    isRenderableRect(fromRect) &&
    isRenderableRect(toRect) &&
    !signal?.aborted
  ) {
    const path = computeFlightPath(fromRect, toRect);
    const clone = createClone(fromRect, imageUrl);
    document.body.appendChild(clone);
    const controls = animate(
      clone,
      { x: path.x, y: path.y, scale: path.scale, opacity: [1, 1, 0.7] },
      { duration: DURATION.page, ease: "linear", opacity: { ease: EASING.standard } },
    );
    // stop() doesn't reliably settle the animation's promise, so race it
    // against the abort signal — otherwise an unmount could leave the clone
    // in the DOM and the caller's await pending forever.
    await new Promise<void>((resolve) => {
      const abort = () => {
        controls.stop();
        resolve();
      };
      signal?.addEventListener("abort", abort, { once: true });
      controls.then(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      });
    });
    clone.remove();
  }

  if (bump && !signal?.aborted) bumpTarget(to, reduced);
}

/**
 * React wrapper around `flyToCart` that tears down any in-flight clone when
 * the calling component unmounts (e.g. the product card navigates away
 * mid-flight). The returned `fly` is referentially stable.
 */
export function useFlyToCart(): (
  from: HTMLElement,
  to: HTMLElement,
  imageUrl: string,
  options?: Omit<FlyToCartOptions, "signal">,
) => Promise<void> {
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current?.abort();
  }, []);

  return useCallback(
    (from, to, imageUrl, options) =>
      flyToCart(from, to, imageUrl, { ...options, signal: controller.current?.signal }),
    [],
  );
}
