"use client";

import type { ReactNode } from "react";
import { DURATION } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";
import type { DismissReason } from "./overlay";
import { useModalDialog } from "./useModalDialog";

type ModalRootProps = {
  open: boolean;
  onDismiss: (reason: DismissReason) => void;
  role?: "dialog" | "alertdialog";
  labelledBy: string;
  describedBy?: string;
  /** Flex alignment of the panel inside the viewport. */
  layoutClassName: string;
  exitDuration: keyof typeof DURATION;
  children: ReactNode;
};

/**
 * The `<dialog>` itself is a transparent full-viewport container; the scrim
 * is our own element rather than `::backdrop`, because `::backdrop` doesn't
 * inherit custom properties in older Safari/Firefox, which would leave the
 * theme-token scrim (`bg-ink/40`) transparent there.
 */
export function ModalRoot({
  open,
  onDismiss,
  role = "dialog",
  labelledBy,
  describedBy,
  layoutClassName,
  exitDuration,
  children,
}: ModalRootProps) {
  const { mounted, dialogProps } = useModalDialog({
    open,
    onDismiss,
    exitMs: DURATION[exitDuration] * 1000,
  });

  if (!mounted) {
    return null;
  }

  return (
    <dialog
      {...dialogProps}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="group fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={() => onDismiss("backdrop")}
        className="absolute inset-0 bg-ink/40 opacity-0 transition-opacity duration-base ease-standard group-data-[state=open]:opacity-100"
      />
      <div
        className={cn("pointer-events-none relative flex h-full w-full", layoutClassName)}
      >
        {children}
      </div>
    </dialog>
  );
}
