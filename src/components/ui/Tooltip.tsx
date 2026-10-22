"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { DURATION } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export type TooltipProps = {
  content: ReactNode;
  side?: TooltipSide;
  /** A single focusable element (button, link…); it gets aria-describedby. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
};

const sides: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 me-2 -translate-y-1/2",
  right: "left-full top-1/2 ms-2 -translate-y-1/2",
};

export function Tooltip({ content, side = "top", children, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  // A short grace period lets the pointer cross the gap onto the tooltip
  // itself, so its content stays hoverable (WCAG 1.4.13).
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), DURATION.fast * 1000);
  };

  // Listening on document, not the trigger: WCAG 1.4.13 requires Escape to
  // dismiss a hover-opened tooltip without moving focus to it first.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const trigger = cloneElement(children, {
    "aria-describedby": cn(children.props["aria-describedby"], id),
  });

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={show}
      onPointerLeave={hideSoon}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "absolute z-50 w-max max-w-xs rounded-theme bg-ink px-2.5 py-1.5 text-xs font-medium text-page shadow-soft",
          "transition-[opacity,visibility] duration-fast ease-standard",
          open ? "visible opacity-100" : "invisible opacity-0",
          sides[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
