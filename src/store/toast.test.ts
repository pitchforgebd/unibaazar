import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTION_TOAST_DURATION_MS,
  DEFAULT_TOAST_DURATION_MS,
  useToastStore,
} from "./toast";

const store = () => useToastStore.getState();

describe("toast store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    store().toasts.forEach((toast) => store().dismiss(toast.id));
    vi.useRealTimers();
  });

  it("keeps the original push(message) API: an info toast auto-dismissed after 2.5s", () => {
    store().push("Added to cart");
    expect(store().toasts).toMatchObject([{ message: "Added to cart", type: "info" }]);
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS - 1);
    expect(store().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(store().toasts).toHaveLength(0);
  });

  it("gives toasts with an action a longer default lifetime", () => {
    store().push({ message: "Removed", action: { label: "Undo", onAction: () => {} } });
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS);
    expect(store().toasts).toHaveLength(1);
    vi.advanceTimersByTime(ACTION_TOAST_DURATION_MS - DEFAULT_TOAST_DURATION_MS);
    expect(store().toasts).toHaveLength(0);
  });

  it("pause freezes the countdown and resume continues with the time left", () => {
    const id = store().push({ message: "Saved", durationMs: 1000 });
    vi.advanceTimersByTime(600);
    store().pause(id);
    vi.advanceTimersByTime(5000);
    expect(store().toasts).toHaveLength(1);
    store().resume(id);
    vi.advanceTimersByTime(399);
    expect(store().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(store().toasts).toHaveLength(0);
  });

  it("pause/resume are no-ops when repeated or after dismissal", () => {
    const id = store().push({ message: "Saved", durationMs: 1000 });
    store().pause(id);
    store().pause(id);
    store().resume(id);
    store().resume(id);
    vi.advanceTimersByTime(1000);
    expect(store().toasts).toHaveLength(0);
    store().resume(id);
    vi.advanceTimersByTime(5000);
    expect(store().toasts).toHaveLength(0);
  });

  it("manual dismiss cancels the pending timer", () => {
    const first = store().push("one");
    store().dismiss(first);
    const second = store().push("two");
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS - 1);
    expect(store().toasts.map((toast) => toast.id)).toEqual([second]);
  });
});
