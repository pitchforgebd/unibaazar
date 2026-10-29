"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { manualOrderAction } from "@/app/(admin)/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";

type Line = { sku: string; qty: string };

export function ManualOrderForm() {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
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
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok && result.id) {
      router.push(`/admin/orders/${result.id}`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">New order</h1>
      <p className="text-sm text-muted">
        Create an order taken by phone or Facebook. Stock is reserved immediately.
      </p>
      <div className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2">
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Select
          label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value as "phone" | "facebook")}
        >
          <option value="phone">Phone</option>
          <option value="facebook">Facebook</option>
        </Select>
        <Textarea
          label="Address"
          containerClassName="sm:col-span-2"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <Select
          label="Area"
          value={area}
          onChange={(event) =>
            setArea(event.target.value as "INSIDE_DHAKA" | "OUTSIDE_DHAKA")
          }
        >
          <option value="INSIDE_DHAKA">Inside Dhaka</option>
          <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
        </Select>
        <Select
          label="Payment"
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(event.target.value as typeof paymentMethod)
          }
        >
          {["COD", "BKASH", "NAGAD", "ROCKET", "CARD"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Input
          label="Customer note"
          containerClassName="sm:col-span-2"
          value={customerNote}
          onChange={(event) => setCustomerNote(event.target.value)}
        />
      </div>

      <div className="space-y-3 rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Products</h2>
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"
          >
            <Input
              label={`SKU ${index + 1}`}
              hideLabel
              placeholder="SKU"
              value={line.sku}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, sku: event.target.value } : row,
                  ),
                )
              }
            />
            <Input
              label={`Qty ${index + 1}`}
              hideLabel
              value={line.qty}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, qty: event.target.value } : row,
                  ),
                )
              }
            />
            <Button
              variant="outline"
              onClick={() =>
                setLines((current) =>
                  current.length === 1
                    ? current
                    : current.filter((_, rowIndex) => rowIndex !== index),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => setLines((current) => [...current, { sku: "", qty: "1" }])}
        >
          Add line
        </Button>
      </div>
      <Button isLoading={pending} onClick={() => void submit()}>
        Create order
      </Button>
    </div>
  );
}
