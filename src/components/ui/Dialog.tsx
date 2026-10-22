"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "./IconButton";
import { ModalRoot } from "./ModalRoot";
import { canDismiss, DIALOG_POLICY, type DismissReason } from "./overlay";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Accessible name for the close (X) button — pass a translated string. */
  closeLabel: string;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  footer,
  size = "md",
  className,
  children,
}: DialogProps) {
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
      layoutClassName="items-center justify-center p-4"
      exitDuration="base"
    >
      <DialogPanel
        className={cn(sizes[size], className)}
        titleId={titleId}
        title={title}
        descriptionId={descriptionId}
        description={description}
        footer={footer}
        headerAction={
          <IconButton
            aria-label={closeLabel}
            size="sm"
            className="-me-2 -mt-1"
            onClick={() => dismiss("close-button")}
          >
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        }
      >
        {children}
      </DialogPanel>
    </ModalRoot>
  );
}

type DialogPanelProps = {
  titleId: string;
  title: ReactNode;
  descriptionId?: string;
  description?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function DialogPanel({
  titleId,
  title,
  descriptionId,
  description,
  headerAction,
  footer,
  className,
  children,
}: DialogPanelProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-theme bg-card shadow-soft",
        "scale-95 opacity-0 transition-[transform,opacity] duration-base ease-emphasized",
        "group-data-[state=open]:scale-100 group-data-[state=open]:opacity-100 motion-reduce:scale-100",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <h2 id={titleId} className="font-heading text-lg font-semibold text-ink">
          {title}
        </h2>
        {headerAction}
      </div>
      {description ? (
        <p id={descriptionId} className="px-5 pt-1 text-sm text-muted">
          {description}
        </p>
      ) : null}
      {children ? <div className="overflow-y-auto px-5 pt-4">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 px-5 pt-5">{footer}</div>
      ) : null}
      <div aria-hidden="true" className="h-5 shrink-0" />
    </div>
  );
}
