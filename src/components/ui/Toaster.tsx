"use client";

import { useToastStore } from "@/store/toast";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className="pointer-events-auto animate-toast-in rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-page shadow-soft"
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
