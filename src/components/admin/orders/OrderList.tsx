"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkBookAction, bulkStatusAction } from "@/app/(admin)/admin/order-actions";
import { areaLabel, prettyStatus } from "@/components/admin/orders/labels";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { orderStatuses } from "@/lib/validation/admin-orders";
import { formatTaka } from "@/lib/utils/currency";
import type { AdminOrderRow, OrderListQuery } from "@/server/admin/orders-admin";

function listHref(query: OrderListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.payment) params.set("payment", query.payment);
  if (query.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query.courier) params.set("courier", query.courier);
  if (query.area) params.set("area", query.area);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/orders?${text}` : "/admin/orders";
}

export function OrderList({
  rows,
  query,
  page,
  pages,
  total,
}: {
  rows: AdminOrderRow[];
  query: OrderListQuery;
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("CONFIRMED");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function toggle(id: string): void {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function runStatus(): Promise<void> {
    if (selected.length === 0) {
      setMessage("Select at least one order.");
      return;
    }
    setPending(true);
    const result = await bulkStatusAction({ ids: selected, status });
    setMessage(result.message);
    setPending(false);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  async function runBook(): Promise<void> {
    if (selected.length === 0) {
      setMessage("Select at least one order.");
      return;
    }
    setPending(true);
    const result = await bulkBookAction({ ids: selected });
    setMessage(result.message);
    setPending(false);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  function openPrint(kind: string): void {
    if (selected.length === 0) {
      setMessage("Select at least one order.");
      return;
    }
    router.push(`/admin/orders/print?kind=${kind}&ids=${selected.join(",")}`);
  }

  function openInvoicePdf(): void {
    if (selected.length === 0) {
      setMessage("Select at least one order.");
      return;
    }
    window.open(`/admin/orders/print/pdf?ids=${selected.join(",")}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "order" : "orders"}
          </p>
        </div>
        <Link href="/admin/orders/new" className={buttonClass()}>
          New order
        </Link>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Search</span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Order ID, phone, or name"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Status</span>
          <select name="status" defaultValue={query.status} className={fieldClass}>
            <option value="">Any status</option>
            {orderStatuses.map((item) => (
              <option key={item} value={item}>
                {prettyStatus(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Payment</span>
          <select name="payment" defaultValue={query.payment} className={fieldClass}>
            <option value="">Any method</option>
            {["COD", "BKASH", "NAGAD", "ROCKET", "CARD"].map((item) => (
              <option key={item} value={item}>
                {prettyStatus(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Payment status</span>
          <select
            name="paymentStatus"
            defaultValue={query.paymentStatus}
            className={fieldClass}
          >
            <option value="">Any</option>
            {["PENDING", "PAID", "FAILED", "REFUNDED"].map((item) => (
              <option key={item} value={item}>
                {prettyStatus(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Courier</span>
          <select name="courier" defaultValue={query.courier} className={fieldClass}>
            <option value="">Any</option>
            <option value="steadfast">Steadfast</option>
            <option value="none">No shipment</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Area</span>
          <select name="area" defaultValue={query.area} className={fieldClass}>
            <option value="">Any area</option>
            <option value="INSIDE_DHAKA">Inside Dhaka</option>
            <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">From</span>
          <input
            type="date"
            name="from"
            defaultValue={query.from}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">To</span>
          <input type="date" name="to" defaultValue={query.to} className={fieldClass} />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className={buttonClass()}>
            Apply filters
          </button>
          <Link href="/admin/orders" className={buttonClass("outline")}>
            Clear
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-4 shadow-soft">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={`${fieldClass} max-w-xs`}
        >
          {orderStatuses.map((item) => (
            <option key={item} value={item}>
              {prettyStatus(item)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={buttonClass("ink")}
          disabled={pending}
          onClick={() => void runStatus()}
        >
          Update status
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
          disabled={pending}
          onClick={() => void runBook()}
        >
          Send to Steadfast
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => openPrint("invoice")}
        >
          Print invoices
        </button>
        <button type="button" className={buttonClass("outline")} onClick={openInvoicePdf}>
          Invoice PDFs
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => openPrint("packing")}
        >
          Packing slips
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => openPrint("label")}
        >
          Shipping labels
        </button>
      </div>
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  aria-label="Select all orders"
                  onChange={() =>
                    setSelected(allChecked ? [] : rows.map((row) => row.id))
                  }
                />
              </th>
              <th className="px-3 py-3 font-semibold">Order</th>
              <th className="px-3 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Total</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Payment</th>
              <th className="px-3 py-3 font-semibold">Area</th>
              <th className="px-3 py-3 font-semibold">Courier</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      aria-label={`Select ${row.number}`}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/orders/${row.id}`}
                      className="font-semibold text-primary"
                    >
                      {row.number}
                    </Link>
                    <p className="text-xs text-muted">{row.placedAt}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">{row.phone}</p>
                  </td>
                  <td className="px-3 py-3">{formatTaka(row.total)}</td>
                  <td className="px-3 py-3">{prettyStatus(row.status)}</td>
                  <td className="px-3 py-3">
                    {prettyStatus(row.paymentMethod)}
                    <p className="text-xs text-muted">
                      {prettyStatus(row.paymentStatus)}
                    </p>
                  </td>
                  <td className="px-3 py-3">{areaLabel(row.area)}</td>
                  <td className="px-3 py-3">{row.courier || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={listHref(query, page - 1)} className={buttonClass("outline")}>
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={listHref(query, page + 1)} className={buttonClass("outline")}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
