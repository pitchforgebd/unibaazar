"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

type QuantityStepperProps = {
  qty: number;
  onChange: (qty: number) => void;
};

/** −/qty/+ control for a cart line. Going below 1 is the store's call
 * (setQty removes the line), so this just reports the requested quantity. */
export function QuantityStepper({ qty, onChange }: QuantityStepperProps) {
  const t = useTranslations("cart");
  return (
    <div className="inline-flex items-center rounded-theme border border-ink/15">
      <IconButton aria-label={t("decrease")} size="sm" onClick={() => onChange(qty - 1)}>
        <Minus aria-hidden="true" className="size-4" />
      </IconButton>
      <span
        aria-live="polite"
        className="w-8 text-center text-sm font-semibold tabular-nums"
      >
        {qty}
      </span>
      <IconButton aria-label={t("increase")} size="sm" onClick={() => onChange(qty + 1)}>
        <Plus aria-hidden="true" className="size-4" />
      </IconButton>
    </div>
  );
}
