export type DismissReason = "escape" | "backdrop" | "close-button";

export type DismissPolicy = {
  closeOnEscape: boolean;
  closeOnBackdrop: boolean;
  /** An in-flight action (e.g. a destructive confirm) blocks every dismissal. */
  busy?: boolean;
};

export const DIALOG_POLICY: DismissPolicy = {
  closeOnEscape: true,
  closeOnBackdrop: true,
};

/** Destructive confirmations must not vanish on a stray click outside. */
export const ALERT_DIALOG_POLICY: DismissPolicy = {
  closeOnEscape: true,
  closeOnBackdrop: false,
};

export function canDismiss(reason: DismissReason, policy: DismissPolicy): boolean {
  if (policy.busy) {
    return false;
  }
  if (reason === "backdrop") {
    return policy.closeOnBackdrop;
  }
  if (reason === "escape") {
    return policy.closeOnEscape;
  }
  return true;
}

let scrollLocks = 0;
let previousOverflow = "";

/** Ref-counted so a Sheet opening a Dialog (nested modals) only restores
 * page scrolling once the last one closes. Returns an idempotent release. */
export function lockScroll(): () => void {
  const root = document.documentElement;
  if (scrollLocks === 0) {
    previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
  }
  scrollLocks += 1;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    scrollLocks -= 1;
    if (scrollLocks === 0) {
      root.style.overflow = previousOverflow;
    }
  };
}
