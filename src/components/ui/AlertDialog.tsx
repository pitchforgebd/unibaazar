"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { DialogPanel } from "./Dialog";
import { ModalRoot } from "./ModalRoot";
import { ALERT_DIALOG_POLICY, canDismiss, type DismissReason } from "./overlay";

export type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** The caller closes the dialog (onOpenChange(false)) once the action settles. */
  onConfirm: () => void;
  /** Shows a spinner on confirm and blocks every way of dismissing. */
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: "destructive" | "primary";
  className?: string;
  children?: ReactNode;
};

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
  loadingLabel,
  variant = "destructive",
  className,
  children,
}: AlertDialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const dismiss = (reason: DismissReason) => {
    if (canDismiss(reason, { ...ALERT_DIALOG_POLICY, busy: isLoading })) {
      onOpenChange(false);
    }
  };

  return (
    <ModalRoot
      open={open}
      onDismiss={dismiss}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
      layoutClassName="items-center justify-center p-4"
      exitDuration="base"
    >
      <DialogPanel
        className={cn("max-w-md", className)}
        titleId={titleId}
        title={title}
        descriptionId={descriptionId}
        description={description}
        footer={
          <>
            {/* Initial focus on the least destructive choice (WAI-ARIA alertdialog guidance). */}
            <Button
              variant="outline"
              data-autofocus=""
              disabled={isLoading}
              onClick={() => dismiss("close-button")}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              isLoading={isLoading}
              loadingLabel={loadingLabel}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogPanel>
    </ModalRoot>
  );
}
