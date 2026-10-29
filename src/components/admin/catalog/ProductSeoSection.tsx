"use client";

import { SeoHints } from "@/components/admin/seo/SeoHints";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";

export function ProductSeoSection({
  form,
  patch,
}: {
  form: ProductFormValues;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  return (
    <section className="grid gap-3 rounded-theme bg-card p-4 shadow-soft md:grid-cols-2">
      <h2 className="font-heading font-semibold text-ink md:col-span-2">SEO</h2>
      <Input
        label="Meta title"
        value={form.metaTitle}
        onChange={(event) => patch({ metaTitle: event.target.value })}
      />
      <Input
        label="Canonical URL"
        value={form.canonical}
        onChange={(event) => patch({ canonical: event.target.value })}
      />
      <Textarea
        label="Meta description"
        containerClassName="md:col-span-2"
        value={form.metaDescription}
        onChange={(event) => patch({ metaDescription: event.target.value })}
      />
      <Input
        label="OG image URL"
        value={form.ogImage}
        onChange={(event) => patch({ ogImage: event.target.value })}
      />
      <Input
        label="Focus keyword"
        value={form.focusKeyword}
        onChange={(event) => patch({ focusKeyword: event.target.value })}
      />
      <Checkbox
        label="Hide from search engines"
        checked={form.noIndex}
        onChange={(event) => patch({ noIndex: event.target.checked })}
      />
      <div className="md:col-span-2">
        <SeoHints
          title={form.metaTitle || form.name}
          description={form.metaDescription || form.shortDescription}
          h1={form.name}
          focusKeyword={form.focusKeyword}
          alts={form.images.map((image) => image.alt)}
        />
      </div>
    </section>
  );
}
