"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supplierAction } from "@/app/(admin)/admin/inventory-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import type { SupplierRow } from "@/server/admin/inventory";

export function SupplierBoard({ rows }: { rows: SupplierRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Suppliers</h1>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Name</th>
              <th className="px-3 py-3 font-semibold">Phone</th>
              <th className="px-3 py-3 font-semibold">Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted">
                  No suppliers yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">{row.email || row.address}</p>
                  </td>
                  <td className="px-3 py-3">{row.phone}</td>
                  <td className="px-3 py-3">{row.orders}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void supplierAction({ name, phone, email, address }).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              setName("");
              setPhone("");
              setEmail("");
              setAddress("");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink sm:col-span-2">
          Add supplier
        </h2>
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
        <Input
          label="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={pending}>
            Save supplier
          </Button>
        </div>
      </form>
    </div>
  );
}
