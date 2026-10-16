"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addAddressAction,
  blockCustomerAction,
  removeAddressAction,
  saveCustomerAction,
} from "@/app/(admin)/admin/customer-actions";
import { areaLabel, prettyStatus } from "@/components/admin/orders/labels";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { formatTaka } from "@/lib/utils/currency";
import type { CustomerProfile } from "@/server/admin/customers";

export function CustomerProfileView({ customer }: { customer: CustomerProfile }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [notes, setNotes] = useState(customer.notes);
  const [tags, setTags] = useState(customer.tags.join(", "));
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState<"INSIDE_DHAKA" | "OUTSIDE_DHAKA">("INSIDE_DHAKA");
  const [label, setLabel] = useState<"HOME" | "OFFICE" | "OTHER">("HOME");
  const [isDefault, setIsDefault] = useState(customer.addresses.length === 0);

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
          <h1 className="text-2xl font-bold text-ink">{customer.name}</h1>
          <p className="text-sm text-muted">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""} · Joined {customer.joined}
          </p>
        </div>
        <button
          type="button"
          className={buttonClass(customer.blocked ? "outline" : "ink")}
          disabled={pending}
          onClick={() =>
            void run(() =>
              blockCustomerAction({
                customerId: customer.id,
                blocked: !customer.blocked,
              }),
            )
          }
        >
          {customer.blocked ? "Unblock" : "Block"}
        </button>
      </div>
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Lifetime value</h2>
          <p className="mt-2 text-3xl font-bold text-ink">
            {formatTaka(customer.lifetimeValue)}
          </p>
          <p className="text-sm text-muted">
            {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"},
            excluding cancelled
          </p>
        </article>
        <article className="rounded-lg bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="font-semibold text-ink">Notes, tags, and segments</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-ink">Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="vip, wholesale"
              className={fieldClass}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-ink">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${fieldClass} h-24 py-2`}
            />
          </label>
          <button
            type="button"
            className={`${buttonClass()} mt-3`}
            disabled={pending}
            onClick={() =>
              void run(() => saveCustomerAction({ customerId: customer.id, notes, tags }))
            }
          >
            Save profile
          </button>
          {customer.blocked ? (
            <p className="mt-3 text-sm font-semibold text-primary">
              This customer is blocked from checkout.
            </p>
          ) : null}
        </article>
      </section>

      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Addresses</h2>
        {customer.addresses.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No saved address yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {customer.addresses.map((address) => (
              <li
                key={address.id}
                className="flex flex-wrap items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {prettyStatus(address.label)}
                    {address.isDefault ? " · Default" : ""}
                  </p>
                  <p>
                    {address.name} · {address.phone}
                  </p>
                  <p className="text-muted">
                    {address.line1}, {address.city} · {areaLabel(address.area)}
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonClass("outline")}
                  disabled={pending}
                  onClick={() =>
                    void run(() =>
                      removeAddressAction({
                        customerId: customer.id,
                        addressId: address.id,
                      }),
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {customer.orderAddresses.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink">Used on orders</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {customer.orderAddresses.map((address) => (
                <li key={address.line}>
                  {address.line} · {address.area}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-ink">Address</span>
            <input
              value={line1}
              onChange={(event) => setLine1(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">City</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Area</span>
            <select
              value={area}
              onChange={(event) =>
                setArea(event.target.value as "INSIDE_DHAKA" | "OUTSIDE_DHAKA")
              }
              className={fieldClass}
            >
              <option value="INSIDE_DHAKA">Inside Dhaka</option>
              <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Label</span>
            <select
              value={label}
              onChange={(event) =>
                setLabel(event.target.value as "HOME" | "OFFICE" | "OTHER")
              }
              className={fieldClass}
            >
              <option value="HOME">Home</option>
              <option value="OFFICE">Office</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Default address
          </label>
        </div>
        <button
          type="button"
          className={`${buttonClass()} mt-3`}
          disabled={pending}
          onClick={() =>
            void run(() =>
              addAddressAction({
                customerId: customer.id,
                name,
                phone,
                line1,
                area,
                city,
                label,
                isDefault,
              }),
            )
          }
        >
          Save address
        </button>
      </section>

      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Order history</h2>
        {customer.orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[560px] w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-semibold">Order</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id} className="border-t border-black/5">
                    <td className="py-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-primary"
                      >
                        {order.number}
                      </Link>
                      <p className="text-xs text-muted">{order.placedAt}</p>
                    </td>
                    <td className="py-2">{prettyStatus(order.status)}</td>
                    <td className="py-2">{formatTaka(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
