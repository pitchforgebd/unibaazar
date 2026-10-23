"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { OrderTimelineStep } from "@/types/catalog";
import { useOrderStatusLabel } from "./orderStatus";

/**
 * Vertical step list for an order's status history. The first not-yet-done
 * step after a done one is marked as the current step.
 */
export function OrderTimeline({ steps }: { steps: OrderTimelineStep[] }) {
  const statusLabel = useOrderStatusLabel();
  const lastDone = steps.reduce((last, step, index) => (step.done ? index : last), -1);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const current = index === lastDone;
        return (
          <li
            key={step.label}
            aria-current={current ? "step" : undefined}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {isLast ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-[11px] top-6 bottom-0 w-0.5",
                  step.done && index < lastDone ? "bg-primary" : "bg-ink/15",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                step.done
                  ? "border-primary bg-primary text-white"
                  : "border-ink/20 bg-card",
                current && "ring-4 ring-primary/20",
              )}
            >
              {step.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <span className="flex flex-col pt-0.5">
              <span
                className={cn(
                  "text-sm",
                  step.done ? "font-semibold text-ink" : "text-muted",
                )}
              >
                {statusLabel(step.label)}
              </span>
              {step.at ? <span className="text-xs text-muted">{step.at}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
