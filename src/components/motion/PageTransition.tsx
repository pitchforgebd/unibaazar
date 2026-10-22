"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { motion } from "motion/react";
import { supportsViewTransitions } from "./viewTransition";
import { DURATION, EASING, prefersReducedMotion } from "./tokens";

type EntryMode = "none" | "fade";

const noopSubscribe = () => () => {};

function clientEntryMode(): EntryMode {
  return supportsViewTransitions() || prefersReducedMotion() ? "none" : "fade";
}

// During hydration React uses the server snapshot, so the first SSR'd page
// never starts at opacity 0 (which would delay LCP); only components mounted
// later — i.e. after a client-side navigation — read the real client mode.
const serverEntryMode = (): EntryMode => "none";

type PageTransitionProps = {
  children: ReactNode;
  /**
   * The `view-transition-name` for this region, so only page content (not
   * the header/footer) cross-fades. Must be unique among mounted elements.
   */
  name?: string;
  className?: string;
};

/**
 * Wrap route content (e.g. in an App Router `template.tsx`). Where View
 * Transitions are supported, navigations started via `startPageTransition`
 * cross-fade this named region natively; elsewhere, newly mounted content
 * fades in with motion. Reduced motion: neither.
 */
export function PageTransition({
  children,
  name = "page",
  className,
}: PageTransitionProps) {
  const mode = useSyncExternalStore(noopSubscribe, clientEntryMode, serverEntryMode);
  return (
    <motion.div
      className={className}
      style={{ viewTransitionName: name }}
      initial={mode === "fade" ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.page, ease: EASING.standard }}
    >
      {children}
    </motion.div>
  );
}
