"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "./IconButton";
import { ModalRoot } from "./ModalRoot";
import { canDismiss, DIALOG_POLICY, type DismissReason } from "./overlay";

export type SheetSide = "left" | "right" | "bottom";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: SheetSide;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const layouts: Record<SheetSide, string> = {
  left: "justify-start",
  right: "justify-end",
  bottom: "items-end",
};

// Under reduced motion the slide is dropped and the panel only fades.
const panels: Record<SheetSide, string> = {
  left: "h-full w-full max-w-sm -translate-x-full motion-reduce:translate-x-0 group-data-[state=open]:translate-x-0",
  right:
    "h-full w-full max-w-sm translate-x-full motion-reduce:translate-x-0 group-data-[state=open]:translate-x-0",
  bottom:
    "max-h-[85dvh] w-full rounded-t-theme translate-y-full motion-reduce:translate-y-0 group-data-[state=open]:translate-y-0",
};

export function Sheet({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  closeLabel,
  footer,
  className,
  children,
}: SheetProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  const dismiss = (reason: DismissReason) => {
    if (canDismiss(reason, DIALOG_POLICY)) {
      onOpenChange(false);
    }
  };

  return (
    <ModalRoot
      open={open}
      onDismiss={dismiss}
      labelledBy={titleId}
      describedBy={descriptionId}
      layoutClassName={layouts[side]}
      exitDuration="slow"
    >
      <div
        className={cn(
          "pointer-events-auto flex flex-col bg-card shadow-soft",
          "transition-[transform,opacity] duration-slow ease-emphasized",
          "motion-reduce:opacity-0 motion-reduce:group-data-[state=open]:opacity-100",
          panels[side],
          className,
        )}
      >
        {side === "bottom" ? (
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink/20"
          />
        ) : null}
        <div className="flex items-start justify-between gap-4 px-5 pt-4">
          <h2 id={titleId} className="font-heading text-lg font-semibold text-ink">
            {title}
          </h2>
          <IconButton
            aria-label={closeLabel}
            size="sm"
            className="-me-2"
            onClick={() => dismiss("close-button")}
          >
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        {description ? (
          <p id={descriptionId} className="px-5 pt-1 text-sm text-muted">
            {description}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </ModalRoot>
  );
}
