"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteRelationAction,
  relationAction,
} from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Stagger, StaggerItem } from "@/components/motion";
import { useToastStore } from "@/store/toast";

type RelationRow = {
  id: string;
  product: string;
  productSlug: string;
  related: string;
  relatedSlug: string;
  kind: string;
};

const blankForm = { id: "", productSlug: "", relatedSlug: "", kind: "RELATED" };

export function RelationBoard({ rows }: { rows: RelationRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(blankForm);
  const [pending, setPending] = useState(false);

  function edit(row: RelationRow) {
    setForm({
      id: row.id,
      productSlug: row.productSlug,
      relatedSlug: row.relatedSlug,
      kind: row.kind,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Product rules</h1>
        <p className="text-sm text-muted">
          Upsell, cross-sell, bundle, and related products.
        </p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No rules yet.</p> : null}
      <Stagger className="space-y-2">
        {rows.map((row) => (
          <StaggerItem key={row.id}>
            <div className="flex items-center justify-between gap-3 rounded-theme bg-card p-3 text-sm text-ink shadow-soft">
              <p>
                <span className="font-semibold">{row.product}</span> ·{" "}
                {row.kind.replaceAll("_", " ").toLowerCase()} · {row.related}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() => edit(row)}
                >
                  Edit
                </button>
                <DeleteButton
                  action={() => deleteRelationAction({ id: row.id })}
                  confirmText="Delete this product rule?"
                />
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void relationAction(form).then((result) => {
            push({ message: result.message, type: result.ok ? "success" : "error" });
            setPending(false);
            if (result.ok) {
              setForm(blankForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-heading font-semibold text-ink">
            {form.id ? "Edit rule" : "New rule"}
          </h2>
          {form.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => setForm(blankForm)}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <Input
          label="Product slug"
          value={form.productSlug}
          onChange={(event) => setForm({ ...form, productSlug: event.target.value })}
        />
        <Input
          label="Related slug"
          value={form.relatedSlug}
          onChange={(event) => setForm({ ...form, relatedSlug: event.target.value })}
        />
        <Select
          label="Kind"
          containerClassName="sm:col-span-2"
          value={form.kind}
          onChange={(event) => setForm({ ...form, kind: event.target.value })}
        >
          <option value="UPSELL">Upsell</option>
          <option value="CROSS_SELL">Cross-sell</option>
          <option value="BUNDLE">Bundle</option>
          <option value="RELATED">Related</option>
        </Select>
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={pending}>
            {form.id ? "Save changes" : "Save rule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
