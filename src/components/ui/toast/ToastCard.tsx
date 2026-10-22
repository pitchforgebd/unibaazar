"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { DURATION, prefersReducedMotion } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";
import type { ToastItem, ToastType } from "@/store/toast";
import { shouldDismissSwipe } from "./swipe";

// Icons stay currentColor (text-page on the inverted ink surface): no
// single status hue stays legible on both Bazaar's black and Luxe's cream
// toast surface, and the shape alone distinguishes the type.
const icons: Record<ToastType, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

type Drag = { pointerId: number; startX: number; startedAt: number };

type ToastCardProps = {
  toast: ToastItem;
  dismissLabel: string;
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
};

export function ToastCard({
  toast,
  dismissLabel,
  onDismiss,
  onPause,
  onResume,
}: ToastCardProps) {
  const cardRef = useRef<HTMLLIElement>(null);
  const drag = useRef<Drag | null>(null);
  const exitTimer = useRef<number | undefined>(undefined);
  const [swipe, setSwipe] = useState({ offsetX: 0, width: 0 });
  const [dragging, setDragging] = useState(false);
  const Icon = icons[toast.type];

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  const exit = (direction: number) => {
    if (prefersReducedMotion()) {
      onDismiss(toast.id);
      return;
    }
    const width = cardRef.current?.offsetWidth ?? 0;
    setSwipe({ offsetX: direction * width, width });
    exitTimer.current = window.setTimeout(
      () => onDismiss(toast.id),
      DURATION.base * 1000,
    );
  };

  const onPointerDown = (event: PointerEvent<HTMLLIElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) {
      return;
    }
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startedAt: Date.now(),
    };
    setSwipe({ offsetX: 0, width: event.currentTarget.offsetWidth });
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    onPause(toast.id);
  };

  const onPointerMove = (event: PointerEvent<HTMLLIElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      const offsetX = event.clientX - drag.current.startX;
      setSwipe((previous) => ({ ...previous, offsetX }));
    }
  };

  const endDrag = (event: PointerEvent<HTMLLIElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    setDragging(false);
    const deltaX = event.clientX - current.startX;
    const width = event.currentTarget.offsetWidth;
    if (shouldDismissSwipe(deltaX, width, Date.now() - current.startedAt)) {
      exit(Math.sign(deltaX));
    } else {
      setSwipe((previous) => ({ ...previous, offsetX: 0 }));
      onResume(toast.id);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onDismiss(toast.id);
    }
  };

  const opacity =
    swipe.width > 0 ? Math.max(0, 1 - Math.abs(swipe.offsetX) / swipe.width) : 1;

  return (
    <li
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={() => onPause(toast.id)}
      onPointerLeave={() => !dragging && onResume(toast.id)}
      onFocus={() => onPause(toast.id)}
      onBlur={() => onResume(toast.id)}
      onKeyDown={onKeyDown}
      style={{ transform: `translateX(${swipe.offsetX}px)`, opacity }}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm touch-pan-y items-center gap-3 rounded-theme bg-ink py-2.5 ps-4 pe-2 text-sm text-page shadow-soft select-none",
        "animate-toast-in motion-reduce:animate-none",
        !dragging && "transition-[transform,opacity] duration-base ease-standard",
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <p className="min-w-0 flex-1 font-medium">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
          className="shrink-0 rounded-theme px-2 py-1 font-semibold underline underline-offset-2 hover:bg-page/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={() => onDismiss(toast.id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-theme hover:bg-page/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}
