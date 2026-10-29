"use client";

import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { Textarea } from "@/components/ui/Textarea";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";

export function ProductDescriptionFields({
  form,
  patch,
}: {
  form: ProductFormValues;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  return (
    <section className="space-y-3 rounded-theme bg-card p-4 shadow-soft">
      <RichTextField
        label="Short description"
        value={form.shortDescription}
        minHeight="min-h-20"
        onChange={(shortDescription) => patch({ shortDescription })}
      />
      <RichTextField
        label="Description"
        value={form.description}
        onChange={(description) => patch({ description })}
      />
      <Textarea
        label="Warranty"
        value={form.warranty}
        onChange={(event) => patch({ warranty: event.target.value })}
      />
      <Textarea
        label="Returns"
        value={form.returns}
        onChange={(event) => patch({ returns: event.target.value })}
      />
    </section>
  );
}
