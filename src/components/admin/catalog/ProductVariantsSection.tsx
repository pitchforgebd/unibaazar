"use client";

import { useState } from "react";
import { slugify } from "@/components/admin/catalog/slugify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";
import type { CatalogOptions } from "@/server/admin/products";

function valueKey(ids: string[]): string {
  return [...ids].sort().join("|");
}

function variantLabel(valueIds: string[], options: CatalogOptions): string {
  return valueIds
    .map(
      (id) =>
        options.attributes
          .flatMap((attribute) => attribute.values)
          .find((value) => value.id === id)?.label ?? id,
    )
    .join(" / ");
}

export function ProductVariantsSection({
  form,
  options,
  patch,
}: {
  form: ProductFormValues;
  options: CatalogOptions;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  const push = useToastStore((state) => state.push);
  const [selectedValues, setSelectedValues] = useState<string[]>(() => [
    ...new Set(form.variants.flatMap((variant) => variant.valueIds)),
  ]);

  function buildVariants() {
    const groups = options.attributes
      .map((attribute) => ({
        id: attribute.id,
        values: attribute.values.filter((value) => selectedValues.includes(value.id)),
      }))
      .filter((group) => group.values.length > 0);
    if (groups.length === 0) {
      push({
        message: "Choose at least one option before building variants.",
        type: "error",
      });
      return;
    }
    let combos: { id: string; label: string }[][] = [[]];
    for (const group of groups) {
      const next: { id: string; label: string }[][] = [];
      for (const row of combos) {
        for (const value of group.values) {
          next.push([...row, value]);
        }
      }
      combos = next;
    }
    if (combos.length > 100) {
      push({ message: "That selection creates more than 100 variants.", type: "error" });
      return;
    }
    const prefix = (form.slug || slugify(form.name) || "SKU")
      .replace(/-/g, "")
      .toUpperCase()
      .slice(0, 16);
    const variants = combos.map((combo, index) => {
      const ids = combo.map((item) => item.id);
      const previous = form.variants.find(
        (variant) => valueKey(variant.valueIds) === valueKey(ids),
      );
      if (previous) {
        return { ...previous, valueIds: ids };
      }
      const sku = [
        prefix,
        ...combo.map((item) => item.label.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()),
      ]
        .filter(Boolean)
        .join("-")
        .slice(0, 64);
      return {
        id: "",
        sku,
        price: form.basePrice || "0",
        salePrice: "",
        costPrice: "",
        stock: "0",
        imageUrl: "",
        status: "ACTIVE" as const,
        isDefault: index === 0,
        valueIds: ids,
      };
    });
    patch({
      type: "VARIABLE",
      attributeIds: groups.map((group) => group.id),
      variants: variants.map((variant, index) => ({
        ...variant,
        isDefault: index === 0,
      })),
    });
    push({ message: `Built ${variants.length} variants. Existing prices were kept.` });
  }

  function updateVariant(
    index: number,
    partial: Partial<ProductFormValues["variants"][number]>,
  ) {
    patch({
      variants: form.variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, ...partial } : variant,
      ),
    });
  }

  return (
    <section className="space-y-3 rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-heading font-semibold text-ink">Variants</h2>
      {form.type === "VARIABLE" ? (
        <div className="space-y-3">
          {options.attributes.map((attribute) => (
            <fieldset key={attribute.id}>
              <legend className="text-sm font-semibold text-ink">{attribute.name}</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {attribute.values.map((value) => (
                  <label key={value.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(value.id)}
                      onChange={(event) =>
                        setSelectedValues((current) =>
                          event.target.checked
                            ? [...current, value.id]
                            : current.filter((id) => id !== value.id),
                        )
                      }
                    />
                    {value.swatch ? (
                      <span
                        className="inline-block size-3 rounded-full border border-black/10"
                        style={{ background: value.swatch }}
                      />
                    ) : null}
                    {value.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button variant="outline" onClick={buildVariants}>
            Build variants
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted">
        A variant that is already on an order stays inactive if you remove it.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="p-2">Options</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Price</th>
              <th className="p-2">Sale</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Image</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {form.variants.map((variant, index) => (
              <tr key={`${variant.id}-${valueKey(variant.valueIds)}-${index}`}>
                <td className="p-2">
                  {form.type === "VARIABLE"
                    ? variantLabel(variant.valueIds, options)
                    : "Default"}
                </td>
                <td className="p-2">
                  <Input
                    label="SKU"
                    hideLabel
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(index, { sku: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    label="Price"
                    hideLabel
                    value={variant.price}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateVariant(index, { price: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    label="Sale price"
                    hideLabel
                    value={variant.salePrice}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateVariant(index, { salePrice: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    label="Cost"
                    hideLabel
                    value={variant.costPrice}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateVariant(index, { costPrice: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    label="Stock"
                    hideLabel
                    value={variant.stock}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateVariant(index, { stock: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    label="Variant image"
                    hideLabel
                    value={variant.imageUrl}
                    onChange={(event) =>
                      updateVariant(index, { imageUrl: event.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <Select
                    label="Variant status"
                    hideLabel
                    value={variant.status}
                    onChange={(event) =>
                      updateVariant(index, {
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
