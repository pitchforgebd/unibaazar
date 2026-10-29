"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteUnitAction, saveUnitAction } from "@/app/(admin)/admin/catalog-actions";
import { RecordTable } from "@/components/admin/catalog/RecordTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import type { UnitFormValues } from "@/lib/validation/admin-catalog";

export function UnitManager({
  rows,
  editing,
}: {
  rows: { id: string; name: string; shortName: string; _count: { products: number } }[];
  editing: UnitFormValues;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(editing);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <RecordTable
        rows={rows.map((row) => ({
          id: row.id,
          title: row.name,
          meta: row.shortName,
          count: row._count.products,
          href: `/admin/units?id=${row.id}`,
        }))}
        onDelete={(id) => deleteUnitAction(id)}
      />
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void saveUnitAction(form).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              router.push("/admin/units");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">
          {form.id ? "Edit unit" : "Add unit"}
        </h2>
        <Input
          label="Name"
          value={form.name}
          placeholder="Piece"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          label="Short name"
          value={form.shortName}
          placeholder="pcs"
          onChange={(event) => setForm({ ...form, shortName: event.target.value })}
        />
        <Button type="submit" isLoading={pending}>
          Save unit
        </Button>
      </form>
    </div>
  );
}
