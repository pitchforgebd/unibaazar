"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/app/(admin)/admin/catalog-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { slugify } from "@/components/admin/catalog/slugify";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { uploadAdminImage } from "@/components/admin/common/uploadAdminImage";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { MAX_UPLOAD_MB } from "@/lib/media/uploadLimits";
import { useToastStore } from "@/store/toast";
import type { CategoryFormValues } from "@/lib/validation/admin-catalog";
import type { CategoryRow } from "@/server/admin/taxonomy";

export function CategoryManager({
  rows,
  editing,
}: {
  rows: CategoryRow[];
  editing: CategoryFormValues;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputId = useId();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Products</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5">
                <td className="p-3" style={{ paddingLeft: 12 + row.depth * 16 }}>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">
                    {row.isActive ? row.slug : `${row.slug} · hidden`}
                  </p>
                </td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/categories?id=${row.id}`}
                      className="text-xs font-semibold text-primary"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      action={() => deleteCategoryAction(row.id)}
                      confirmText={`Delete "${row.name}"? This can't be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void saveCategoryAction(form).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              router.push("/admin/categories");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">
          {form.id ? "Edit category" : "Add category"}
        </h2>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              slug: slugTouched ? form.slug : slugify(event.target.value),
            })
          }
        />
        <Input
          label="Slug"
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true);
            setForm({ ...form, slug: event.target.value });
          }}
        />
        <Select
          label="Parent category"
          value={form.parentId}
          onChange={(event) => setForm({ ...form, parentId: event.target.value })}
        >
          <option value="">No parent</option>
          {rows
            .filter((row) => row.id !== form.id)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {`${"— ".repeat(row.depth)}${row.name}`}
              </option>
            ))}
        </Select>
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <RichTextField
          label="SEO text"
          value={form.seoText}
          onChange={(html) => setForm({ ...form, seoText: html })}
        />
        <div>
          <label
            htmlFor={imageInputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Image
          </label>
          {form.imageUrl ? (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imageUrl}
                alt=""
                className="size-20 rounded-full object-cover shadow-soft"
              />
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:underline"
                onClick={() => setForm({ ...form, imageUrl: "" })}
              >
                Remove image
              </button>
            </div>
          ) : null}
          <input
            id={imageInputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              setUploading(true);
              void uploadAdminImage(file).then((result) => {
                setUploading(false);
                if (result.ok && result.url) {
                  const url = result.url;
                  setForm((current) => ({ ...current, imageUrl: url }));
                } else {
                  push({ message: result.message, type: "error" });
                }
              });
            }}
            className="block w-full text-sm text-foreground"
          />
          <p className="mt-1 text-xs text-muted">
            {uploading
              ? "Uploading…"
              : `Square photo works best (shown as a circle). Up to ${MAX_UPLOAD_MB} MB.`}
          </p>
        </div>
        <Input
          label="Fallback color (hue)"
          value={form.imageHue}
          placeholder="0-360, used when there's no image"
          onChange={(event) => setForm({ ...form, imageHue: event.target.value })}
        />
        <Input
          label="Sort order"
          value={form.sortOrder}
          onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
        />
        <Input
          label="Meta title"
          value={form.metaTitle}
          onChange={(event) => setForm({ ...form, metaTitle: event.target.value })}
        />
        <Textarea
          label="Meta description"
          value={form.metaDescription}
          onChange={(event) => setForm({ ...form, metaDescription: event.target.value })}
        />
        <Input
          label="Canonical URL"
          value={form.canonical}
          onChange={(event) => setForm({ ...form, canonical: event.target.value })}
        />
        <Input
          label="OG image URL"
          value={form.ogImage}
          onChange={(event) => setForm({ ...form, ogImage: event.target.value })}
        />
        <Input
          label="Focus keyword"
          value={form.focusKeyword}
          onChange={(event) => setForm({ ...form, focusKeyword: event.target.value })}
        />
        <Checkbox
          label="Hide from search engines"
          checked={form.noIndex}
          onChange={(event) => setForm({ ...form, noIndex: event.target.checked })}
        />
        <SeoHints
          title={form.metaTitle || form.name}
          description={form.metaDescription || form.description}
          h1={form.name}
          focusKeyword={form.focusKeyword}
        />
        <Checkbox
          label="Active"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
        />
        <Button type="submit" isLoading={pending || uploading}>
          Save category
        </Button>
      </form>
    </div>
  );
}
