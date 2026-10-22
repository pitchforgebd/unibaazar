"use client";

import { cn } from "@/lib/utils/cn";
import { useToastStore } from "@/store/toast";
import { ToastCard } from "./ToastCard";

export type ToastStackProps = {
  /** Landmark name, e.g. t("toast.region") — "Notifications". */
  regionLabel: string;
  /** Accessible name for each toast's close button. */
  dismissLabel: string;
  placement?: "top" | "bottom";
  className?: string;
};

/**
 * Successor to ui/Toaster (which stays as-is until screens migrate): same
 * store and push() API, plus icons by type, an optional undo action,
 * pause-on-hover/focus, Escape and swipe to dismiss. Mount exactly one of
 * the two — they read the same queue.
 */
export function ToastStack({
  regionLabel,
  dismissLabel,
  placement = "top",
  className,
}: ToastStackProps) {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const pause = useToastStore((state) => state.pause);
  const resume = useToastStore((state) => state.resume);

  // The region and its live list stay mounted even when empty: screen
  // readers only announce insertions into a live region that already exists.
  return (
    <section
      aria-label={regionLabel}
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[80] px-4",
        placement === "top" ? "top-20" : "bottom-20 sm:bottom-6",
        className,
      )}
    >
      <ol
        aria-live="polite"
        aria-relevant="additions"
        className={cn(
          "flex flex-col items-center gap-2",
          placement === "bottom" && "flex-col-reverse",
        )}
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            dismissLabel={dismissLabel}
            onDismiss={dismiss}
            onPause={pause}
            onResume={resume}
          />
        ))}
      </ol>
    </section>
  );
}
