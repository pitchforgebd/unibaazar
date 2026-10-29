"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLabelAction, saveLabelAction } from "@/app/(admin)/admin/catalog-actions";
import { RecordTable } from "@/components/admin/catalog/RecordTable";
import { slugify } from "@/components/admin/catalog/slugify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import type { LabelFormValues } from "@/lib/validation/admin-catalog";

export function LabelManager({
  rows,
  editing,
}: {
  rows: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    _count: { products: number };
  }[];
  editing: LabelFormValues;
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
          meta: `${row.kind} · ${row.slug}`,
          count: row._count.products,
          href: `/admin/labels?id=${row.id}`,
        }))}
        onDelete={(id) => deleteLabelAction(id)}
      />
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void saveLabelAction(form).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              router.push("/admin/labels");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">
          {form.id ? "Edit label" : "Add label"}
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
          label="Kind"
          value={form.kind}
          onChange={(event) =>
            setForm({ ...form, kind: event.target.value as LabelFormValues["kind"] })
          }
        >
          <option value="NEW">New</option>
          <option value="HOT">Hot</option>
          <option value="SALE">Sale</option>
        </Select>
        <Button type="submit" isLoading={pending}>
          Save label
        </Button>
      </form>
    </div>
  );
}
