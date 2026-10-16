"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bookCourierAction,
  itemsAction,
  notesAction,
  paymentAction,
  setStatusAction,
  syncCourierAction,
} from "@/app/(admin)/admin/order-actions";
import { areaLabel, prettyStatus } from "@/components/admin/orders/labels";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { orderStatuses } from "@/lib/validation/admin-orders";
import { formatTaka } from "@/lib/utils/currency";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

export function OrderDetail({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState("");
  const [customerNote, setCustomerNote] = useState(order.customerNote);
  const [internalNote, setInternalNote] = useState(order.internalNote);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [discount, setDiscount] = useState(String(order.discount));
  const [deliveryCharge, setDeliveryCharge] = useState(String(order.deliveryCharge));
  const [addSku, setAddSku] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [items, setItems] = useState(
    order.items.map((item) => ({
      ...item,
      qty: String(item.qty),
      unitPrice: String(item.unitPrice),
      removed: false,
    })),
  );

  async function run(
    task: () => Promise<{ ok: boolean; message: string }>,
  ): Promise<void> {
    setPending(true);
    const result = await task();
    setMessage(result.message);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{order.number}</h1>
          <p className="text-sm text-muted">
            {order.placedAt} · {prettyStatus(order.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/print?kind=invoice&ids=${order.id}`}
            className={buttonClass("outline")}
          >
            Invoice
          </Link>
          <Link
            href={`/admin/orders/print/pdf?ids=${order.id}`}
            className={buttonClass("outline")}
          >
            Invoice PDF
          </Link>
          <Link
            href={`/admin/orders/print?kind=packing&ids=${order.id}`}
            className={buttonClass("outline")}
          >
            Packing slip
          </Link>
          <Link
            href={`/admin/orders/print?kind=label&ids=${order.id}`}
            className={buttonClass("outline")}
          >
            Label
          </Link>
        </div>
      </div>
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="font-semibold text-ink">Customer</h2>
          <p className="mt-2 text-sm text-ink">{order.name}</p>
          <p className="text-sm text-muted">{order.phone}</p>
          {order.email ? <p className="text-sm text-muted">{order.email}</p> : null}
          <p className="mt-2 text-sm text-ink">{order.address}</p>
          <p className="text-sm text-muted">
            {areaLabel(order.area)} · {prettyStatus(order.paymentMethod)} ·{" "}
            {formatTaka(order.total)}
          </p>
          {order.blacklisted ? (
            <p className="mt-2 text-sm font-semibold text-primary">
              Blacklisted customer
            </p>
          ) : null}
        </article>
        <article className="rounded-lg bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Fraud score</h2>
          <p className="mt-2 text-3xl font-bold text-ink">{order.fraud.score}</p>
          <p className="text-sm font-semibold text-ink">{order.fraud.label}</p>
          <p className="mt-1 text-sm text-muted">{order.fraud.detail}</p>
        </article>
      </section>

      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Status</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">New status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className={fieldClass}
            >
              {orderStatuses.map((item) => (
                <option key={item} value={item}>
                  {prettyStatus(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Timeline note</span>
            <input
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            className={buttonClass()}
            disabled={pending}
            onClick={() =>
              void run(() =>
                setStatusAction({ orderId: order.id, status, note: statusNote }),
              )
            }
          >
            Save status
          </button>
        </div>
        <ol className="mt-4 space-y-2">
          {order.history.map((row) => (
            <li key={row.id} className="text-sm text-ink">
              <span className="font-semibold">{prettyStatus(row.status)}</span>
              <span className="text-muted"> · {row.at}</span>
              {row.note ? <span className="block text-muted">{row.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Items</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-semibold">Product</th>
                <th className="py-2 font-semibold">Qty</th>
                <th className="py-2 font-semibold">Price</th>
                <th className="py-2 font-semibold">Keep</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-t border-black/5">
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.sku}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      value={item.qty}
                      aria-label={`Quantity for ${item.sku}`}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, qty: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className={`${fieldClass} w-24`}
                      disabled={item.removed}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      value={item.unitPrice}
                      aria-label={`Price for ${item.sku}`}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, unitPrice: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className={`${fieldClass} w-28`}
                      disabled={item.removed}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={!item.removed}
                      aria-label={`Keep ${item.sku}`}
                      onChange={() =>
                        setItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, removed: !row.removed } : row,
                          ),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Discount</span>
            <input
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Delivery charge</span>
            <input
              value={deliveryCharge}
              onChange={(event) => setDeliveryCharge(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Add SKU</span>
            <input
              value={addSku}
              onChange={(event) => setAddSku(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Add qty</span>
            <input
              value={addQty}
              onChange={(event) => setAddQty(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted">
          Subtotal {formatTaka(order.subtotal)} · Discount {formatTaka(order.discount)} ·
          Delivery {formatTaka(order.deliveryCharge)} · Total {formatTaka(order.total)}
        </p>
        <button
          type="button"
          className={`${buttonClass()} mt-3`}
          disabled={pending}
          onClick={() => {
            const kept = items.filter((item) => !item.removed);
            if (kept.length === 0 && !addSku.trim()) {
              setMessage("An order needs at least one item.");
              return;
            }
            void run(() =>
              itemsAction({
                orderId: order.id,
                discount,
                deliveryCharge,
                items: kept.map((item) => ({
                  id: item.id,
                  qty: item.qty,
                  unitPrice: item.unitPrice,
                })),
                addSku: addSku.trim(),
                addQty,
              }),
            );
          }}
        >
          Save items
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Notes</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-ink">Customer note</span>
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              className={`${fieldClass} h-24 py-2`}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-ink">Internal note</span>
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className={`${fieldClass} h-24 py-2`}
            />
          </label>
          <button
            type="button"
            className={`${buttonClass()} mt-3`}
            disabled={pending}
            onClick={() =>
              void run(() =>
                notesAction({ orderId: order.id, customerNote, internalNote }),
              )
            }
          >
            Save notes
          </button>
        </article>
        <article className="space-y-4">
          <div className="rounded-lg bg-card p-4 shadow-soft">
            <h2 className="font-semibold text-ink">Payment</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <select
                value={paymentStatus}
                aria-label="Payment status"
                onChange={(event) =>
                  setPaymentStatus(event.target.value as typeof paymentStatus)
                }
                className={`${fieldClass} max-w-xs`}
              >
                {["PENDING", "PAID", "FAILED", "REFUNDED"].map((item) => (
                  <option key={item} value={item}>
                    {prettyStatus(item)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={buttonClass("ink")}
                disabled={pending}
                onClick={() =>
                  void run(() =>
                    paymentAction({ orderId: order.id, status: paymentStatus }),
                  )
                }
              >
                Save payment
              </button>
            </div>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-soft">
            <h2 className="font-semibold text-ink">Steadfast</h2>
            <p className="mt-2 text-sm text-muted">
              {order.shipment
                ? `${order.shipment.courier} · ${order.shipment.consignmentId || "No consignment"} · ${prettyStatus(order.shipment.status)}`
                : "No shipment yet."}
            </p>
            <p className="text-sm text-muted">Tracking {order.trackingId || "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass()}
                disabled={pending}
                onClick={() => void run(() => bookCourierAction(order.id))}
              >
                Send to Steadfast
              </button>
              <button
                type="button"
                className={buttonClass("outline")}
                disabled={pending}
                onClick={() => void run(() => syncCourierAction(order.id))}
              >
                Sync status
              </button>
            </div>
          </div>
        </article>
      </section>

      {order.returns.length > 0 ? (
        <section className="rounded-lg bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Returns</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {order.returns.map((row) => (
              <li key={row.id}>
                <Link href="/admin/orders/returns" className="font-semibold text-primary">
                  {prettyStatus(row.status)}
                </Link>
                <span className="text-muted"> · {row.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Queued messages</h2>
        {order.notices.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No SMS or email has been queued for this order.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {order.notices.map((notice, index) => (
              <li key={`${notice.channel}-${notice.at}-${index}`}>
                <span className="font-semibold text-ink">
                  {notice.channel} · {notice.status}
                </span>
                <span className="text-muted"> · {notice.at}</span>
                <p className="text-muted">{notice.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
