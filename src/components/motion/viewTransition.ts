import { prefersReducedMotion } from "./tokens";

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" && typeof document.startViewTransition === "function"
  );
}

/**
 * Runs `update` (typically a router navigation or a state swap) inside a
 * View Transition where the browser supports one and the user hasn't asked
 * for reduced motion; otherwise just runs it. Resolves once the DOM update
 * has been applied, and rejects if `update` does.
 */
export async function startPageTransition(
  update: () => void | Promise<void>,
): Promise<void> {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    await update();
    return;
  }
  const transition = document.startViewTransition(update);
  // `ready` rejects whenever the browser skips the animation (tab hidden,
  // a newer transition started). That's expected, not an error — the
  // update itself still ran — so swallow it to avoid unhandled rejections.
  transition.ready.catch(() => {});
  await transition.updateCallbackDone;
}
