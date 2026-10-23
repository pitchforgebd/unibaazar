"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  blockCustomerAction,
  saveCustomerAction,
} from "@/app/(admin)/admin/customer-actions";
import { orderStatusVariant, prettyStatus } from "@/components/admin/orders/labels";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Reveal } from "@/components/motion";
import { useToastStore } from "@/store/toast";
import { formatTaka } from "@/lib/utils/currency";
import type { CustomerProfile } from "@/server/admin/customers";
import { CustomerAddressPanel } from "./CustomerAddressPanel";

export function CustomerProfileView({ customer }: { customer: CustomerProfile }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [notes, setNotes] = useState(customer.notes);
  const [tags, setTags] = useState(customer.tags.join(", "));

  async function toggleBlock(): Promise<void> {
    setPending(true);
    const result = await blockCustomerAction({
      customerId: customer.id,
      blocked: !customer.blocked,
    });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    setBlockConfirmOpen(false);
    if (result.ok) {
      router.refresh();
    }
  }

  async function saveProfile(): Promise<void> {
    setPending(true);
    const result = await saveCustomerAction({ customerId: customer.id, notes, tags });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <Reveal className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">{customer.name}</h1>
          <p className="text-sm text-muted">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""} · Joined {customer.joined}
          </p>
        </div>
        <Button
          variant={customer.blocked ? "outline" : "destructive"}
          isLoading={pending}
          onClick={() =>
            customer.blocked ? void toggleBlock() : setBlockConfirmOpen(true)
          }
        >
          {customer.blocked ? "Unblock" : "Block"}
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-theme bg-card p-4 shadow-soft">
          <h2 className="font-heading font-semibold text-ink">Lifetime value</h2>
          <p className="mt-2 text-3xl font-bold text-ink">
            {formatTaka(customer.lifetimeValue)}
          </p>
          <p className="text-sm text-muted">
            {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"},
            excluding cancelled
          </p>
        </article>
        <article className="rounded-theme bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="font-heading font-semibold text-ink">
            Notes, tags, and segments
          </h2>
          <Input
            label="Tags"
            containerClassName="mt-3"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="vip, wholesale"
          />
          <Textarea
            label="Notes"
            containerClassName="mt-3"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <Button className="mt-3" isLoading={pending} onClick={() => void saveProfile()}>
            Save profile
          </Button>
          {customer.blocked ? (
            <p className="mt-3">
              <Badge variant="outline">Blocked from checkout</Badge>
            </p>
          ) : null}
        </article>
      </section>

      <CustomerAddressPanel customer={customer} />

      <section className="rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Order history</h2>
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
                  <tr key={order.id} className="border-t border-ink/10">
                    <td className="py-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-primary"
                      >
                        {order.number}
                      </Link>
                      <p className="text-xs text-muted">{order.placedAt}</p>
                    </td>
                    <td className="py-2">
                      <Badge variant={orderStatusVariant(order.status)}>
                        {prettyStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="py-2">{formatTaka(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog
        open={blockConfirmOpen}
        onOpenChange={setBlockConfirmOpen}
        title="Block this customer?"
        description="A blocked customer cannot complete checkout until unblocked."
        confirmLabel="Block"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Blocking…"
        onConfirm={() => void toggleBlock()}
      />
    </Reveal>
  );
}
