"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  couponAction,
  deleteCouponAction,
  toggleCouponAction,
} from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Reveal } from "@/components/motion";
import { useToastStore } from "@/store/toast";
import { toDatetimeLocal } from "@/lib/utils/datetime";

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  category: string;
  categorySlug: string;
  product: string;
  productSlug: string;
  startsAt: string;
  endsAt: string;
  startsAtIso: string;
  endsAtIso: string;
  isActive: boolean;
};

const blankForm = {
  id: "",
  code: "",
  type: "PERCENT",
  value: "10",
  minSubtotal: "0",
  usageLimit: "",
  perUserLimit: "",
  startsAt: "",
  endsAt: "",
  categorySlug: "",
  productSlug: "",
  isActive: true,
};

export function CouponBoard({ rows }: { rows: CouponRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(blankForm);
  const [pending, setPending] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<CouponRow | null>(null);

  function edit(row: CouponRow) {
    setForm({
      id: row.id,
      code: row.code,
      type: row.type,
      value: String(row.value),
      minSubtotal: String(row.minSubtotal),
      usageLimit: row.usageLimit === null ? "" : String(row.usageLimit),
      perUserLimit: row.perUserLimit === null ? "" : String(row.perUserLimit),
      startsAt: toDatetimeLocal(row.startsAtIso),
      endsAt: toDatetimeLocal(row.endsAtIso),
      categorySlug: row.categorySlug,
      productSlug: row.productSlug,
      isActive: row.isActive,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function toggleActive(row: CouponRow, isActive: boolean): Promise<void> {
    setPending(true);
    const result = await toggleCouponAction({ id: row.id, isActive });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    setDeactivateTarget(null);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Coupons</h1>
      <Reveal className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Code</th>
              <th className="px-3 py-3 font-semibold">Offer</th>
              <th className="px-3 py-3 font-semibold">Limits</th>
              <th className="px-3 py-3 font-semibold">Scope</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/10 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{row.code}</p>
                  <p className="mt-1">
                    <Badge variant={row.isActive ? "success" : "outline"}>
                      {row.isActive ? "Active" : "Off"}
                    </Badge>
                  </p>
                </td>
                <td className="px-3 py-3">
                  {row.type === "FREE_SHIPPING"
                    ? "Free shipping"
                    : row.type === "PERCENT"
                      ? `${row.value}%`
                      : `৳${row.value}`}
                  <p className="text-xs text-muted">Min ৳{row.minSubtotal}</p>
                </td>
                <td className="px-3 py-3">
                  {row.usedCount}
                  {row.usageLimit === null ? "" : ` / ${row.usageLimit}`}
                  <p className="text-xs text-muted">
                    {row.perUserLimit === null
                      ? "Any customer"
                      : `${row.perUserLimit} per customer`}
                  </p>
                </td>
                <td className="px-3 py-3">
                  {row.product || row.category || "Whole cart"}
                  <p className="text-xs text-muted">
                    {[row.startsAt, row.endsAt].filter(Boolean).join(" – ")}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      className="text-left text-xs font-semibold text-primary"
                      onClick={() => edit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-left text-xs font-semibold text-primary"
                      disabled={pending}
                      onClick={() =>
                        row.isActive
                          ? setDeactivateTarget(row)
                          : void toggleActive(row, true)
                      }
                    >
                      {row.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <DeleteButton
                      action={() => deleteCouponAction({ id: row.id })}
                      confirmText={`Delete coupon ${row.code}?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void couponAction(form).then((result) => {
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
            {form.id ? "Edit coupon" : "New coupon"}
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
          label="Code"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
        >
          <option value="PERCENT">Percent</option>
          <option value="FIXED">Fixed amount</option>
          <option value="FREE_SHIPPING">Free shipping</option>
        </Select>
        <Input
          label="Value"
          value={form.value}
          onChange={(event) => setForm({ ...form, value: event.target.value })}
        />
        <Input
          label="Minimum cart"
          value={form.minSubtotal}
          onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
        />
        <Input
          label="Usage limit"
          value={form.usageLimit}
          onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
          placeholder="Blank for unlimited"
        />
        <Input
          label="Per customer"
          value={form.perUserLimit}
          onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })}
          placeholder="Blank for unlimited"
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
          label="Category slug"
          value={form.categorySlug}
          onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}
          placeholder="Optional"
        />
        <Input
          label="Product slug"
          value={form.productSlug}
          onChange={(event) => setForm({ ...form, productSlug: event.target.value })}
          placeholder="Optional"
        />
        <Checkbox
          label="Active"
          className="sm:col-span-2"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
        />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={pending}>
            {form.id ? "Save changes" : "Save coupon"}
          </Button>
        </div>
      </form>
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate coupon"
        description={
          deactivateTarget
            ? `Deactivate coupon ${deactivateTarget.code}? Customers won't be able to apply it until it's reactivated.`
            : ""
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Deactivating…"
        onConfirm={() => deactivateTarget && void toggleActive(deactivateTarget, false)}
      />
    </div>
  );
}
