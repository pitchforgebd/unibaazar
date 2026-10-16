"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { manualOrderAction } from "@/app/(admin)/admin/order-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type Line = { sku: string; qty: string };

export function ManualOrderForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<"INSIDE_DHAKA" | "OUTSIDE_DHAKA">("INSIDE_DHAKA");
  const [paymentMethod, setPaymentMethod] = useState<
    "COD" | "BKASH" | "NAGAD" | "ROCKET" | "CARD"
  >("COD");
  const [source, setSource] = useState<"phone" | "facebook">("phone");
  const [customerNote, setCustomerNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ sku: "", qty: "1" }]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(): Promise<void> {
    setPending(true);
    const result = await manualOrderAction({
      name,
      phone,
      email,
      address,
      area,
      paymentMethod,
      customerNote,
      source,
      lines: lines.filter((line) => line.sku.trim()),
    });
    setMessage(result.message);
    setPending(false);
    if (result.ok && result.id) {
      router.push(`/admin/orders/${result.id}`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">New order</h1>
      <p className="text-sm text-muted">
        Create an order taken by phone or Facebook. Stock is reserved immediately.
      </p>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      <div className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2">
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
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Source</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as "phone" | "facebook")}
            className={fieldClass}
          >
            <option value="phone">Phone</option>
            <option value="facebook">Facebook</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Address</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={`${fieldClass} h-24 py-2`}
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
          <span className="mb-1 block font-semibold text-ink">Payment</span>
          <select
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as typeof paymentMethod)
            }
            className={fieldClass}
          >
            {["COD", "BKASH", "NAGAD", "ROCKET", "CARD"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Customer note</span>
          <input
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Products</h2>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <input
              value={line.sku}
              aria-label={`SKU ${index + 1}`}
              placeholder="SKU"
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, sku: event.target.value } : row,
                  ),
                )
              }
              className={fieldClass}
            />
            <input
              value={line.qty}
              aria-label={`Qty ${index + 1}`}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, qty: event.target.value } : row,
                  ),
                )
              }
              className={fieldClass}
            />
            <button
              type="button"
              className={buttonClass("outline")}
              onClick={() =>
                setLines((current) =>
                  current.length === 1
                    ? current
                    : current.filter((_, rowIndex) => rowIndex !== index),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => setLines((current) => [...current, { sku: "", qty: "1" }])}
        >
          Add line
        </button>
      </div>
      <button
        type="button"
        className={buttonClass()}
        disabled={pending}
        onClick={() => void submit()}
      >
        Create order
      </button>
    </div>
  );
}
