"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteProductAction,
  saveProductAction,
  uploadCatalogImageAction,
} from "@/app/(admin)/admin/catalog-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { GripVertical, ImageUp, Star, Trash2, UploadCloud } from "lucide-react";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";
import type { CatalogOptions } from "@/server/admin/products";

const areaClass =
  "min-h-24 w-full rounded-md border border-black/10 bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

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

export function ProductForm({
  initial,
  options,
}: {
  initial: ProductFormValues;
  options: CatalogOptions;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(initial.id !== "");
  const [selectedValues, setSelectedValues] = useState<string[]>(() => [
    ...new Set(initial.variants.flatMap((variant) => variant.valueIds)),
  ]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  function patch(partial: Partial<ProductFormValues>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function buildVariants() {
    const groups = options.attributes
      .map((attribute) => ({
        id: attribute.id,
        values: attribute.values.filter((value) => selectedValues.includes(value.id)),
      }))
      .filter((group) => group.values.length > 0);
    if (groups.length === 0) {
      setMessage("Choose at least one option before building variants.");
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
      setMessage("That selection creates more than 100 variants.");
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
    setMessage(`Built ${variants.length} variants. Existing prices were kept.`);
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setPending(true);
    for (const file of files) {
      const body = new FormData();
      body.set("file", file);
      const result = await uploadCatalogImageAction(body);
      if (!result.ok || !result.url) {
        setMessage(result.message);
        setPending(false);
        return;
      }
      setForm((current) => ({
        ...current,
        images: [...current.images, { id: "", url: result.url ?? "", alt: "" }].slice(
          0,
          12,
        ),
      }));
    }
    setPending(false);
  }

  function moveImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0) {
      return;
    }
    setForm((current) => {
      const images = [...current.images];
      const [item] = images.splice(from, 1);
      if (!item) {
        return current;
      }
      images.splice(to, 0, item);
      return { ...current, images };
    });
  }

  function updateVariant(
    index: number,
    partial: Partial<ProductFormValues["variants"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, ...partial } : variant,
      ),
    }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        const first = form.variants[0];
        const payload: ProductFormValues = {
          ...form,
          basePrice:
            form.type === "SIMPLE" && first
              ? first.price || form.basePrice
              : form.basePrice,
          variants:
            form.type === "SIMPLE" && first
              ? [
                  {
                    ...first,
                    valueIds: [],
                    isDefault: true,
                    price: first.price || form.basePrice,
                  },
                ]
              : form.variants,
        };
        void saveProductAction(payload).then((result) => {
          setPending(false);
          setMessage(result.message);
          if (!result.ok || !result.id) {
            return;
          }
          if (!form.id) {
            router.push(`/admin/products/${result.id}`);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          {form.id ? "Edit product" : "Add product"}
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className={buttonClass("outline")}>
            All products
          </Link>
          <button className={buttonClass()} type="submit" disabled={pending}>
            Save product
          </button>
        </div>
      </div>
      {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
      <section className="grid gap-3 rounded-lg bg-card p-4 shadow-soft md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="font-semibold">Name</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              patch({ name, slug: slugTouched ? form.slug : slugify(name) });
            }}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Slug</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              patch({ slug: event.target.value });
            }}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Type</span>
          <select
            className={`${fieldClass} mt-1`}
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
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold">Status</span>
          <select
            className={`${fieldClass} mt-1`}
            value={form.status}
            onChange={(event) =>
              patch({ status: event.target.value as ProductFormValues["status"] })
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold">Publish at</span>
          <input
            className={`${fieldClass} mt-1`}
            type="datetime-local"
            value={form.publishedAt}
            onChange={(event) => patch({ publishedAt: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Brand</span>
          <select
            className={`${fieldClass} mt-1`}
            value={form.brandId}
            onChange={(event) => patch({ brandId: event.target.value })}
          >
            <option value="">Choose a brand</option>
            {options.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold">Unit</span>
          <select
            className={`${fieldClass} mt-1`}
            value={form.unitId}
            onChange={(event) => patch({ unitId: event.target.value })}
          >
            <option value="">No unit</option>
            {options.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="font-semibold">Categories</legend>
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
          <legend className="font-semibold">Labels</legend>
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
        <label className="text-sm md:col-span-2">
          <span className="font-semibold">Tags</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.tags}
            onChange={(event) => patch({ tags: event.target.value })}
            placeholder="cotton, summer"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => patch({ featured: event.target.checked })}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(event) => patch({ isNew: event.target.checked })}
          />
          New arrival
        </label>
      </section>
      <section className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
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
        <label className="block text-sm">
          <span className="font-semibold">Warranty</span>
          <textarea
            className={`${areaClass} mt-1`}
            value={form.warranty}
            onChange={(event) => patch({ warranty: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Returns</span>
          <textarea
            className={`${areaClass} mt-1`}
            value={form.returns}
            onChange={(event) => patch({ returns: event.target.value })}
          />
        </label>
      </section>
      <section className="grid gap-3 rounded-lg bg-card p-4 shadow-soft md:grid-cols-3">
        <label className="text-sm">
          <span className="font-semibold">Regular price</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.basePrice}
            onChange={(event) => patch({ basePrice: event.target.value })}
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Low-stock threshold</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.lowStockThreshold}
            onChange={(event) => patch({ lowStockThreshold: event.target.value })}
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Weight (grams)</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.weightGrams}
            onChange={(event) => patch({ weightGrams: event.target.value })}
            inputMode="numeric"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Length (cm)</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.lengthCm}
            onChange={(event) => patch({ lengthCm: event.target.value })}
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Width (cm)</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.widthCm}
            onChange={(event) => patch({ widthCm: event.target.value })}
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Height (cm)</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.heightCm}
            onChange={(event) => patch({ heightCm: event.target.value })}
            inputMode="decimal"
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Shipping class</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.shippingClass}
            onChange={(event) => patch({ shippingClass: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Sale starts</span>
          <input
            className={`${fieldClass} mt-1`}
            type="datetime-local"
            value={form.saleStartsAt}
            onChange={(event) => patch({ saleStartsAt: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Sale ends</span>
          <input
            className={`${fieldClass} mt-1`}
            type="datetime-local"
            value={form.saleEndsAt}
            onChange={(event) => patch({ saleEndsAt: event.target.value })}
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="font-semibold">Video URL</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.videoUrl}
            onChange={(event) => patch({ videoUrl: event.target.value })}
          />
        </label>
      </section>
      <section className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Gallery</h2>
            <p className="text-xs text-muted">
              Up to 12 photos. The first image is the primary listing photo — drag the
              grip handle to reorder.
            </p>
          </div>
          <span className="rounded-full bg-page px-2.5 py-1 text-xs font-semibold text-muted">
            {form.images.length} / 12
          </span>
        </div>
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-page/40 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-page/70"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            if (event.dataTransfer.files.length > 0) {
              event.preventDefault();
              void onUpload(event.dataTransfer.files);
            }
          }}
        >
          <UploadCloud className="text-muted" size={28} />
          <span className="text-sm font-semibold text-ink">
            Drag &amp; drop photos, or click to browse
          </span>
          <span className="text-xs text-muted">
            PNG, JPEG, WEBP or GIF — multiple files OK
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={(event) => void onUpload(event.target.files)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${fieldClass} flex-1`}
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="Or paste an image URL: https://..."
            aria-label="Image URL"
          />
          <button
            className={buttonClass("outline")}
            type="button"
            onClick={() => {
              if (!imageUrl.trim()) {
                return;
              }
              patch({
                images: [...form.images, { id: "", url: imageUrl.trim(), alt: "" }].slice(
                  0,
                  12,
                ),
              });
              setImageUrl("");
            }}
          >
            <ImageUp size={15} />
            Add URL
          </button>
        </div>
        {form.images.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.images.map((image, index) => (
              <li
                key={`${image.id}-${index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.dataTransfer.files.length > 0) {
                    void onUpload(event.dataTransfer.files);
                    return;
                  }
                  if (dragIndex !== null) {
                    moveImage(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                className={`group relative overflow-hidden rounded-lg border p-2 transition-colors ${dragIndex === index ? "border-primary bg-page/60" : "border-black/10 bg-page/20"}`}
              >
                {index === 0 ? (
                  <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                    <Star size={11} className="fill-white" /> Primary
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-grab touch-none text-muted/70 active:cursor-grabbing"
                    aria-hidden
                  >
                    <GripVertical size={16} />
                  </span>
                  {/* Gallery previews use stored URLs, including files uploaded at runtime. */}
                  <div
                    className="h-24 w-full rounded-md bg-card bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${image.url.replace(/["\\]/g, "")}")`,
                    }}
                    role="img"
                    aria-label={image.alt || "Gallery image"}
                  />
                </div>
                <input
                  className={`${fieldClass} mt-2 h-9`}
                  value={image.alt}
                  aria-label={`Alt text ${index + 1}`}
                  placeholder="Alt text (for SEO & accessibility)"
                  onChange={(event) => {
                    const images = form.images.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, alt: event.target.value } : item,
                    );
                    patch({ images });
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs font-semibold text-ink/60 hover:text-primary disabled:opacity-30"
                    onClick={() => moveImage(index, index - 1)}
                    disabled={index === 0}
                  >
                    ← Move earlier
                  </button>
                  <button
                    type="button"
                    title="Remove image"
                    aria-label="Remove image"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500/80 hover:bg-red-500/10 hover:text-red-600"
                    onClick={() =>
                      patch({
                        images: form.images.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-black/10 p-4 text-center text-xs text-muted">
            No photos yet — a professional listing needs at least one.
          </p>
        )}
      </section>
      <section className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Variants</h2>
        {form.type === "VARIABLE" ? (
          <div className="space-y-3">
            {options.attributes.map((attribute) => (
              <fieldset key={attribute.id}>
                <legend className="text-sm font-semibold">{attribute.name}</legend>
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
                          className="inline-block h-3 w-3 rounded-full border border-black/10"
                          style={{ background: value.swatch }}
                        />
                      ) : null}
                      {value.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              className={buttonClass("outline")}
              type="button"
              onClick={buildVariants}
            >
              Build variants
            </button>
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
                    <input
                      className={fieldClass}
                      value={variant.sku}
                      aria-label="SKU"
                      onChange={(event) =>
                        updateVariant(index, { sku: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={fieldClass}
                      value={variant.price}
                      aria-label="Price"
                      inputMode="decimal"
                      onChange={(event) =>
                        updateVariant(index, { price: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={fieldClass}
                      value={variant.salePrice}
                      aria-label="Sale price"
                      inputMode="decimal"
                      onChange={(event) =>
                        updateVariant(index, { salePrice: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={fieldClass}
                      value={variant.costPrice}
                      aria-label="Cost"
                      inputMode="decimal"
                      onChange={(event) =>
                        updateVariant(index, { costPrice: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={fieldClass}
                      value={variant.stock}
                      aria-label="Stock"
                      inputMode="numeric"
                      onChange={(event) =>
                        updateVariant(index, { stock: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={fieldClass}
                      value={variant.imageUrl}
                      aria-label="Variant image"
                      onChange={(event) =>
                        updateVariant(index, { imageUrl: event.target.value })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className={fieldClass}
                      value={variant.status}
                      aria-label="Variant status"
                      onChange={(event) =>
                        updateVariant(index, {
                          status: event.target.value as "ACTIVE" | "INACTIVE",
                        })
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-3 rounded-lg bg-card p-4 shadow-soft md:grid-cols-2">
        <h2 className="font-semibold text-ink md:col-span-2">SEO</h2>
        <label className="text-sm">
          <span className="font-semibold">Meta title</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.metaTitle}
            onChange={(event) => patch({ metaTitle: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Canonical URL</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.canonical}
            onChange={(event) => patch({ canonical: event.target.value })}
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="font-semibold">Meta description</span>
          <textarea
            className={`${areaClass} mt-1`}
            value={form.metaDescription}
            onChange={(event) => patch({ metaDescription: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">OG image URL</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.ogImage}
            onChange={(event) => patch({ ogImage: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-semibold">Focus keyword</span>
          <input
            className={`${fieldClass} mt-1`}
            value={form.focusKeyword}
            onChange={(event) => patch({ focusKeyword: event.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.noIndex}
            onChange={(event) => patch({ noIndex: event.target.checked })}
          />
          Hide from search engines
        </label>
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
      {form.id ? (
        <button
          className={buttonClass("outline")}
          type="button"
          onClick={() => {
            if (!window.confirm("Delete this product?")) {
              return;
            }
            void deleteProductAction(form.id).then((result) => {
              setMessage(result.message);
              if (result.ok) {
                router.push("/admin/products");
              }
            });
          }}
        >
          Delete product
        </button>
      ) : null}
    </form>
  );
}
