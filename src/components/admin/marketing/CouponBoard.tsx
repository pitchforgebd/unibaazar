"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  couponAction,
  deleteCouponAction,
  toggleCouponAction,
} from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";
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
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

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
    setMessage("");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Coupons</h1>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
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
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{row.code}</p>
                  <p className="text-xs text-muted">{row.isActive ? "Active" : "Off"}</p>
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
                      onClick={() => {
                        void toggleCouponAction({
                          id: row.id,
                          isActive: !row.isActive,
                        }).then(() => {
                          router.refresh();
                        });
                      }}
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
      </div>
      <form
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void couponAction(form).then((result) => {
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
            {form.id ? "Edit coupon" : "New coupon"}
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
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Code</span>
          <input
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            className={fieldClass}
          >
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed amount</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Value</span>
          <input
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Minimum cart</span>
          <input
            value={form.minSubtotal}
            onChange={(event) => setForm({ ...form, minSubtotal: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Usage limit</span>
          <input
            value={form.usageLimit}
            onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
            placeholder="Blank for unlimited"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Per customer</span>
          <input
            value={form.perUserLimit}
            onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })}
            placeholder="Blank for unlimited"
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
          <span className="mb-1 block font-semibold text-ink">Category slug</span>
          <input
            value={form.categorySlug}
            onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}
            placeholder="Optional"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Product slug</span>
          <input
            value={form.productSlug}
            onChange={(event) => setForm({ ...form, productSlug: event.target.value })}
            placeholder="Optional"
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Active
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass()} disabled={pending}>
            {form.id ? "Save changes" : "Save coupon"}
          </button>
        </div>
        {message ? <p className="text-sm text-ink sm:col-span-2">{message}</p> : null}
      </form>
    </div>
  );
}
