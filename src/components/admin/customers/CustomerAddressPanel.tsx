"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addAddressAction,
  removeAddressAction,
} from "@/app/(admin)/admin/customer-actions";
import { areaLabel, prettyStatus } from "@/components/admin/orders/labels";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import type { CustomerProfile } from "@/server/admin/customers";

export function CustomerAddressPanel({ customer }: { customer: CustomerProfile }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState<"INSIDE_DHAKA" | "OUTSIDE_DHAKA">("INSIDE_DHAKA");
  const [label, setLabel] = useState<"HOME" | "OFFICE" | "OTHER">("HOME");
  const [isDefault, setIsDefault] = useState(customer.addresses.length === 0);

  async function remove(addressId: string): Promise<void> {
    setPending(true);
    const result = await removeAddressAction({ customerId: customer.id, addressId });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    setRemoveTargetId(null);
    if (result.ok) {
      router.refresh();
    }
  }

  async function add(): Promise<void> {
    setPending(true);
    const result = await addAddressAction({
      customerId: customer.id,
      name,
      phone,
      line1,
      area,
      city,
      label,
      isDefault,
    });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <section className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-heading font-semibold text-ink">Addresses</h2>
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
              <Button
                variant="outline"
                isLoading={pending}
                onClick={() => setRemoveTargetId(address.id)}
              >
                Remove
              </Button>
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
          label="Address"
          containerClassName="sm:col-span-2"
          value={line1}
          onChange={(event) => setLine1(event.target.value)}
        />
        <Input
          label="City"
          value={city}
          onChange={(event) => setCity(event.target.value)}
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
          label="Label"
          value={label}
          onChange={(event) =>
            setLabel(event.target.value as "HOME" | "OFFICE" | "OTHER")
          }
        >
          <option value="HOME">Home</option>
          <option value="OFFICE">Office</option>
          <option value="OTHER">Other</option>
        </Select>
        <Checkbox
          label="Default address"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
        />
      </div>
      <Button className="mt-3" isLoading={pending} onClick={() => void add()}>
        Save address
      </Button>
      <AlertDialog
        open={removeTargetId !== null}
        onOpenChange={(open) => !open && setRemoveTargetId(null)}
        title="Remove address"
        description="Remove this saved address from the customer's account?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Removing…"
        onConfirm={() => removeTargetId && void remove(removeTargetId)}
      />
    </section>
  );
}
