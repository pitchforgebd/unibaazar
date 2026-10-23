"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteBrandAction, saveBrandAction } from "@/app/(admin)/admin/catalog-actions";
import { RecordTable } from "@/components/admin/catalog/RecordTable";
import { slugify } from "@/components/admin/catalog/slugify";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";
import type { BrandFormValues } from "@/lib/validation/admin-catalog";

export function BrandManager({
  rows,
  editing,
}: {
  rows: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    _count: { products: number };
  }[];
  editing: BrandFormValues;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <RecordTable
        rows={rows.map((row) => ({
          id: row.id,
          title: row.name,
          meta: row.slug,
          count: row._count.products,
          href: `/admin/brands?id=${row.id}`,
        }))}
        onDelete={(id) => deleteBrandAction(id)}
      />
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void saveBrandAction(form).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              router.push("/admin/brands");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">
          {form.id ? "Edit brand" : "Add brand"}
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
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
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
        <Checkbox
          label="Active"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
        />
        <Button type="submit" isLoading={pending}>
          Save brand
        </Button>
      </form>
    </div>
  );
}
