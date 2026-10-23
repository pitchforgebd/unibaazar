"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkBookAction, bulkStatusAction } from "@/app/(admin)/admin/order-actions";
import {
  areaLabel,
  orderStatusVariant,
  paymentStatusVariant,
  prettyStatus,
} from "./labels";
import { OrderFiltersForm } from "./OrderFiltersForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Reveal } from "@/components/motion";
import { useToastStore } from "@/store/toast";
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
  const push = useToastStore((state) => state.push);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("CONFIRMED");
  const [pending, setPending] = useState(false);
  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function toggle(id: string): void {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function requireSelection(): boolean {
    if (selected.length === 0) {
      push({ message: "Select at least one order.", type: "error" });
      return false;
    }
    return true;
  }

  async function runStatus(): Promise<void> {
    if (!requireSelection()) {
      return;
    }
    setPending(true);
    const result = await bulkStatusAction({ ids: selected, status });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  async function runBook(): Promise<void> {
    if (!requireSelection()) {
      return;
    }
    setPending(true);
    const result = await bulkBookAction({ ids: selected });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  function openPrint(kind: string): void {
    if (!requireSelection()) {
      return;
    }
    router.push(`/admin/orders/print?kind=${kind}&ids=${selected.join(",")}`);
  }

  function openInvoicePdf(): void {
    if (!requireSelection()) {
      return;
    }
    window.open(`/admin/orders/print/pdf?ids=${selected.join(",")}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Orders</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "order" : "orders"}
          </p>
        </div>
        <Link href="/admin/orders/new" className={buttonStyles()}>
          New order
        </Link>
      </div>

      <OrderFiltersForm query={query} />

      <div className="flex flex-wrap items-end gap-2 rounded-theme bg-card p-4 shadow-soft">
        <Select
          label="Bulk status"
          hideLabel
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="max-w-xs"
        >
          {orderStatuses.map((item) => (
            <option key={item} value={item}>
              {prettyStatus(item)}
            </option>
          ))}
        </Select>
        <Button variant="outline" isLoading={pending} onClick={() => void runStatus()}>
          Update status
        </Button>
        <Button variant="outline" isLoading={pending} onClick={() => void runBook()}>
          Send to Steadfast
        </Button>
        <Button variant="outline" onClick={() => openPrint("invoice")}>
          Print invoices
        </Button>
        <Button variant="outline" onClick={openInvoicePdf}>
          Invoice PDFs
        </Button>
        <Button variant="outline" onClick={() => openPrint("packing")}>
          Packing slips
        </Button>
        <Button variant="outline" onClick={() => openPrint("label")}>
          Shipping labels
        </Button>
      </div>

      <Reveal className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-muted">
            <tr>
              <th className="px-3 py-3">
                <Checkbox
                  checked={allChecked}
                  label={<span className="sr-only">Select all orders</span>}
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
                <tr key={row.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      label={<span className="sr-only">Select {row.number}</span>}
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
                  <td className="px-3 py-3">
                    <Badge variant={orderStatusVariant(row.status)}>
                      {prettyStatus(row.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {prettyStatus(row.paymentMethod)}
                    <p className="mt-1">
                      <Badge variant={paymentStatusVariant(row.paymentStatus)}>
                        {prettyStatus(row.paymentStatus)}
                      </Badge>
                    </p>
                  </td>
                  <td className="px-3 py-3">{areaLabel(row.area)}</td>
                  <td className="px-3 py-3">{row.courier || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Reveal>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={listHref(query, page - 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={listHref(query, page + 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
