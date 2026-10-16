"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFlashAction, flashAction } from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { toDatetimeLocal } from "@/lib/utils/datetime";

type FlashRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  startsAtIso: string;
  endsAtIso: string;
  isActive: boolean;
  items: { sku: string; salePrice: number; qtyLimit: number | null }[];
};

const blankForm = {
  id: "",
  name: "",
  startsAt: "",
  endsAt: "",
  sku: "",
  salePrice: "",
  qtyLimit: "",
  isActive: true,
};

export function FlashBoard({ rows }: { rows: FlashRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: FlashRow) {
    const item = row.items[0];
    setForm({
      id: row.id,
      name: row.name,
      startsAt: toDatetimeLocal(row.startsAtIso),
      endsAt: toDatetimeLocal(row.endsAtIso),
      sku: item?.sku ?? "",
      salePrice: item ? String(item.salePrice) : "",
      qtyLimit:
        item?.qtyLimit === null || item?.qtyLimit === undefined
          ? ""
          : String(item.qtyLimit),
      isActive: row.isActive,
    });
    setMessage("");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Flash sales</h1>
        <p className="text-sm text-muted">
          The store countdown uses the end time. A quantity limit stops checkout once that
          many units are sold.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">
                {row.name} · {row.isActive ? "Active" : "Off"}
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
                  action={() => deleteFlashAction({ id: row.id })}
                  confirmText={`Delete flash sale ${row.name}?`}
                />
              </div>
            </div>
            <p className="text-sm text-muted">
              {row.startsAt} – {row.endsAt}
            </p>
            {row.items.map((item) => (
              <p key={item.sku} className="text-sm text-ink">
                {item.sku} · ৳{item.salePrice}
                {item.qtyLimit === null ? "" : ` · limit ${item.qtyLimit}`}
              </p>
            ))}
          </article>
        ))}
      </div>
      <form
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void flashAction(form).then((result) => {
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
          <h2 className="font-semibold text-ink">
            {form.id ? "Edit flash sale" : "New flash sale"}
          </h2>
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
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Starts</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Ends</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">SKU</span>
          <input
            value={form.sku}
            onChange={(event) => setForm({ ...form, sku: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Sale price</span>
          <input
            value={form.salePrice}
            onChange={(event) => setForm({ ...form, salePrice: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Quantity limit</span>
          <input
            value={form.qtyLimit}
            onChange={(event) => setForm({ ...form, qtyLimit: event.target.value })}
            placeholder="Blank for no limit"
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Active
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass()} disabled={pending}>
            {form.id ? "Save changes" : "Save flash sale"}
          </button>
        </div>
        {message ? <p className="text-sm text-ink sm:col-span-2">{message}</p> : null}
      </form>
    </div>
  );
}
