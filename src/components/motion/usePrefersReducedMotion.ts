"use client";

import { useSyncExternalStore } from "react";
import { prefersReducedMotion } from "./tokens";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * Live React view of `prefersReducedMotion()` — re-renders when the OS
 * setting flips mid-session. The server snapshot is `false` so markup is
 * stable across hydration; primitives that animate via CSS also carry an
 * `@media (prefers-reduced-motion: reduce)` rule so the very first paint is
 * already correct before this hook can run.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
