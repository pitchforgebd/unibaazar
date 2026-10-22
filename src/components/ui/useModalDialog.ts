"use client";

import { useEffect, useRef, useState } from "react";
import { lockScroll, type DismissReason } from "./overlay";

type Options = {
  open: boolean;
  onDismiss: (reason: DismissReason) => void;
  /** Must match the exit transition's duration class on the panel. */
  exitMs: number;
};

/**
 * Drives a native `<dialog>` via showModal(), which gives us the top layer,
 * inert background content and focus containment for free. We add what the
 * native element lacks: exit transitions (it unmounts instantly on close()),
 * scroll locking, reliable focus return, and a controlled `open` prop.
 */
export function useModalDialog({ open, onDismiss, exitMs }: Options) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const openRef = useRef(open);
  const onDismissRef = useRef(onDismiss);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const releaseScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    openRef.current = open;
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) {
      return;
    }
    setVisible(false);
    const timer = window.setTimeout(() => {
      dialogRef.current?.close();
      setMounted(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !mounted || !dialog) {
      return;
    }
    if (!dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      releaseScrollRef.current = lockScroll();
      // React's autoFocus calls focus() at commit, before showModal() makes
      // the element focusable, so initial focus is opt-in via data-autofocus.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      // Force a style flush so the "closed" styles are the transition's
      // starting point rather than being skipped on first paint.
      dialog.getBoundingClientRect();
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  useEffect(() => {
    if (mounted) {
      return;
    }
    releaseScrollRef.current?.();
    releaseScrollRef.current = null;
    returnFocusRef.current?.focus();
    returnFocusRef.current = null;
  }, [mounted]);

  useEffect(
    () => () => {
      releaseScrollRef.current?.();
    },
    [],
  );

  const dialogProps = {
    ref: dialogRef,
    "data-state": visible ? "open" : "closed",
    onCancel: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      onDismissRef.current("escape");
    },
    // Chrome's close-watcher anti-abuse rule makes `cancel` non-cancelable on
    // a repeated Escape without user activation, so the dialog can close
    // natively behind our back; re-open it and let the policy decide.
    onClose: () => {
      const dialog = dialogRef.current;
      if (openRef.current && dialog && !dialog.open) {
        dialog.showModal();
        onDismissRef.current("escape");
      }
    },
  };

  return { mounted, dialogProps };
}
