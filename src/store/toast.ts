"use client";

import { create } from "zustand";

export type ToastType = "info" | "success" | "warning" | "error";

export type ToastAction = {
  label: string;
  onAction: () => void;
};

export type ToastInput = {
  message: string;
  type?: ToastType;
  action?: ToastAction;
  durationMs?: number;
};

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  durationMs: number;
};

type ToastState = {
  toasts: ToastItem[];
  /** Accepts a bare message (the original API, still used by existing
   * call sites) or a typed toast with an optional undo-style action. */
  push: (input: string | ToastInput) => number;
  dismiss: (id: number) => void;
  /** Freeze auto-dismiss while the toast is hovered/focused/dragged. */
  pause: (id: number) => void;
  resume: (id: number) => void;
};

export const DEFAULT_TOAST_DURATION_MS = 2500;
// A toast with an action needs time to be read *and* reached by keyboard.
export const ACTION_TOAST_DURATION_MS = 6000;

type Timer = {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
};

const timers = new Map<number, Timer>();
let nextId = 1;

function clearTimer(id: number) {
  const timer = timers.get(id);
  if (timer?.handle) {
    clearTimeout(timer.handle);
  }
  timers.delete(id);
}

export const useToastStore = create<ToastState>((set, get) => {
  const schedule = (id: number, ms: number) => {
    timers.set(id, {
      handle: setTimeout(() => get().dismiss(id), ms),
      remaining: ms,
      startedAt: Date.now(),
    });
  };

  return {
    toasts: [],
    push: (input) => {
      const toast: ToastInput = typeof input === "string" ? { message: input } : input;
      const id = nextId;
      nextId += 1;
      const durationMs =
        toast.durationMs ??
        (toast.action ? ACTION_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS);
      set((state) => ({
        toasts: [
          ...state.toasts,
          {
            id,
            message: toast.message,
            type: toast.type ?? "info",
            action: toast.action,
            durationMs,
          },
        ],
      }));
      schedule(id, durationMs);
      return id;
    },
    dismiss: (id) => {
      clearTimer(id);
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    },
    pause: (id) => {
      const timer = timers.get(id);
      if (!timer?.handle) {
        return;
      }
      clearTimeout(timer.handle);
      timers.set(id, {
        handle: null,
        remaining: Math.max(0, timer.remaining - (Date.now() - timer.startedAt)),
        startedAt: timer.startedAt,
      });
    },
    resume: (id) => {
      const timer = timers.get(id);
      if (!timer || timer.handle) {
        return;
      }
      schedule(id, timer.remaining);
    },
  };
});
