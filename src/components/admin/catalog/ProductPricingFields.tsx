"use client";

import { Input } from "@/components/ui/Input";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";

export function ProductPricingFields({
  form,
  patch,
}: {
  form: ProductFormValues;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  return (
    <section className="grid gap-3 rounded-theme bg-card p-4 shadow-soft md:grid-cols-3">
      <Input
        label="Regular price"
        value={form.basePrice}
        onChange={(event) => patch({ basePrice: event.target.value })}
        inputMode="decimal"
      />
      <Input
        label="Low-stock threshold"
        value={form.lowStockThreshold}
        onChange={(event) => patch({ lowStockThreshold: event.target.value })}
        inputMode="numeric"
      />
      <Input
        label="Weight (grams)"
        value={form.weightGrams}
        onChange={(event) => patch({ weightGrams: event.target.value })}
        inputMode="numeric"
      />
      <Input
        label="Length (cm)"
        value={form.lengthCm}
        onChange={(event) => patch({ lengthCm: event.target.value })}
        inputMode="decimal"
      />
      <Input
        label="Width (cm)"
        value={form.widthCm}
        onChange={(event) => patch({ widthCm: event.target.value })}
        inputMode="decimal"
      />
      <Input
        label="Height (cm)"
        value={form.heightCm}
        onChange={(event) => patch({ heightCm: event.target.value })}
        inputMode="decimal"
      />
      <Input
        label="Shipping class"
        value={form.shippingClass}
        onChange={(event) => patch({ shippingClass: event.target.value })}
      />
      <Input
        label="Sale starts"
        type="datetime-local"
        value={form.saleStartsAt}
        onChange={(event) => patch({ saleStartsAt: event.target.value })}
      />
      <Input
        label="Sale ends"
        type="datetime-local"
        value={form.saleEndsAt}
        onChange={(event) => patch({ saleEndsAt: event.target.value })}
      />
      <Input
        label="Video URL"
        containerClassName="md:col-span-3"
        value={form.videoUrl}
        onChange={(event) => patch({ videoUrl: event.target.value })}
      />
    </section>
  );
}
