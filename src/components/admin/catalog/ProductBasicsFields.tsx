"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";
import type { CatalogOptions } from "@/server/admin/products";

export function ProductBasicsFields({
  form,
  options,
  onNameChange,
  onSlugChange,
  patch,
}: {
  form: ProductFormValues;
  options: CatalogOptions;
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  return (
    <section className="grid gap-3 rounded-theme bg-card p-4 shadow-soft md:grid-cols-2">
      <Input
        label="Name"
        containerClassName="md:col-span-2"
        value={form.name}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <Input
        label="Slug"
        value={form.slug}
        onChange={(event) => onSlugChange(event.target.value)}
      />
      <Select
        label="Type"
        value={form.type}
        onChange={(event) => {
          const type = event.target.value as ProductFormValues["type"];
          if (type === "SIMPLE") {
            const first = form.variants[0];
            patch({
              type,
              attributeIds: [],
              variants: first
                ? [{ ...first, valueIds: [], isDefault: true }]
                : form.variants,
            });
            return;
          }
          patch({ type });
        }}
      >
        <option value="SIMPLE">Simple</option>
        <option value="VARIABLE">Variable</option>
      </Select>
      <Select
        label="Status"
        value={form.status}
        onChange={(event) =>
          patch({ status: event.target.value as ProductFormValues["status"] })
        }
      >
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="SCHEDULED">Scheduled</option>
      </Select>
      <Input
        label="Publish at"
        type="datetime-local"
        value={form.publishedAt}
        onChange={(event) => patch({ publishedAt: event.target.value })}
      />
      <Select
        label="Brand"
        value={form.brandId}
        onChange={(event) => patch({ brandId: event.target.value })}
      >
        <option value="">Choose a brand</option>
        {options.brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </Select>
      <Select
        label="Unit"
        value={form.unitId}
        onChange={(event) => patch({ unitId: event.target.value })}
      >
        <option value="">No unit</option>
        {options.units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </Select>
      <fieldset className="text-sm">
        <legend className="font-medium text-foreground">Categories</legend>
        <div className="mt-2 max-h-40 space-y-1 overflow-auto">
          {options.categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2"
              style={{ paddingLeft: category.depth * 12 }}
            >
              <input
                type="checkbox"
                checked={form.categoryIds.includes(category.id)}
                onChange={(event) =>
                  patch({
                    categoryIds: event.target.checked
                      ? [...form.categoryIds, category.id]
                      : form.categoryIds.filter((id) => id !== category.id),
                  })
                }
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="text-sm">
        <legend className="font-medium text-foreground">Labels</legend>
        <div className="mt-2 space-y-1">
          {options.labels.length === 0 ? (
            <p className="text-muted">Add labels from the Labels screen.</p>
          ) : null}
          {options.labels.map((label) => (
            <label key={label.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.labelIds.includes(label.id)}
                onChange={(event) =>
                  patch({
                    labelIds: event.target.checked
                      ? [...form.labelIds, label.id]
                      : form.labelIds.filter((id) => id !== label.id),
                  })
                }
              />
              {label.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Input
        label="Tags"
        containerClassName="md:col-span-2"
        value={form.tags}
        onChange={(event) => patch({ tags: event.target.value })}
        placeholder="cotton, summer"
      />
      <Checkbox
        label="Featured"
        checked={form.featured}
        onChange={(event) => patch({ featured: event.target.checked })}
      />
      <Checkbox
        label="New arrival"
        checked={form.isNew}
        onChange={(event) => patch({ isNew: event.target.checked })}
      />
    </section>
  );
}
