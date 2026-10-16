"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteRelationAction,
  relationAction,
} from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

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
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: RelationRow) {
    setForm({
      id: row.id,
      productSlug: row.productSlug,
      relatedSlug: row.relatedSlug,
      kind: row.kind,
    });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Product rules</h1>
        <p className="text-sm text-muted">
          Upsell, cross-sell, bundle, and related products.
        </p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No rules yet.</p> : null}
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 text-sm text-ink"
        >
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
      ))}
      <form
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void relationAction(form).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setForm(blankForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-semibold text-ink">{form.id ? "Edit rule" : "New rule"}</h2>
          {form.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => {
                setForm(blankForm);
                setMessage("");
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Product slug</span>
          <input
            value={form.productSlug}
            onChange={(event) => setForm({ ...form, productSlug: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Related slug</span>
          <input
            value={form.relatedSlug}
            onChange={(event) => setForm({ ...form, relatedSlug: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Kind</span>
          <select
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value })}
            className={fieldClass}
          >
            <option value="UPSELL">Upsell</option>
            <option value="CROSS_SELL">Cross-sell</option>
            <option value="BUNDLE">Bundle</option>
            <option value="RELATED">Related</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass()} disabled={pending}>
            {form.id ? "Save changes" : "Save rule"}
          </button>
        </div>
        {message ? <p className="text-sm text-ink sm:col-span-2">{message}</p> : null}
      </form>
    </div>
  );
}
