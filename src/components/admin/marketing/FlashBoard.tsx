"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFlashAction, flashAction } from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Stagger, StaggerItem } from "@/components/motion";
import { useToastStore } from "@/store/toast";
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
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(blankForm);
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
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Flash sales</h1>
        <p className="text-sm text-muted">
          The store countdown uses the end time. A quantity limit stops checkout once that
          many units are sold.
        </p>
      </div>
      <Stagger className="space-y-3">
        {rows.map((row) => (
          <StaggerItem key={row.id}>
            <article className="rounded-theme bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {row.name}
                  <Badge variant={row.isActive ? "success" : "outline"}>
                    {row.isActive ? "Active" : "Off"}
                  </Badge>
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
          </StaggerItem>
        ))}
      </Stagger>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void flashAction(form).then((result) => {
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
            {form.id ? "Edit flash sale" : "New flash sale"}
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
          label="Name"
          containerClassName="sm:col-span-2"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          type="datetime-local"
          label="Starts"
          value={form.startsAt}
          onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
        />
        <Input
          type="datetime-local"
          label="Ends"
          value={form.endsAt}
          onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(event) => setForm({ ...form, sku: event.target.value })}
        />
        <Input
          label="Sale price"
          value={form.salePrice}
          onChange={(event) => setForm({ ...form, salePrice: event.target.value })}
        />
        <Input
          label="Quantity limit"
          value={form.qtyLimit}
          onChange={(event) => setForm({ ...form, qtyLimit: event.target.value })}
          placeholder="Blank for no limit"
        />
        <Checkbox
          label="Active"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
        />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={pending}>
            {form.id ? "Save changes" : "Save flash sale"}
          </Button>
        </div>
      </form>
    </div>
  );
}
