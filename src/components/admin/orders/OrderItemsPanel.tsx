"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { itemsAction } from "@/app/(admin)/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import { formatTaka } from "@/lib/utils/currency";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

export function OrderItemsPanel({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
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

  async function save(): Promise<void> {
    const kept = items.filter((item) => !item.removed);
    if (kept.length === 0 && !addSku.trim()) {
      push({ message: "An order needs at least one item.", type: "error" });
      return;
    }
    setPending(true);
    const result = await itemsAction({
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
    });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <section className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-heading font-semibold text-ink">Items</h2>
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
              <tr key={item.id} className="border-t border-ink/10">
                <td className="py-2 pr-3">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">{item.sku}</p>
                </td>
                <td className="py-2 pr-3">
                  <Input
                    label={`Quantity for ${item.sku}`}
                    hideLabel
                    value={item.qty}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, qty: event.target.value } : row,
                        ),
                      )
                    }
                    containerClassName="w-24"
                    disabled={item.removed}
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    label={`Price for ${item.sku}`}
                    hideLabel
                    value={item.unitPrice}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, unitPrice: event.target.value }
                            : row,
                        ),
                      )
                    }
                    containerClassName="w-28"
                    disabled={item.removed}
                  />
                </td>
                <td className="py-2">
                  <Checkbox
                    checked={!item.removed}
                    label={<span className="sr-only">Keep {item.sku}</span>}
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
        <Input
          label="Discount"
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
        />
        <Input
          label="Delivery charge"
          value={deliveryCharge}
          onChange={(event) => setDeliveryCharge(event.target.value)}
        />
        <Input
          label="Add SKU"
          value={addSku}
          onChange={(event) => setAddSku(event.target.value)}
        />
        <Input
          label="Add qty"
          value={addQty}
          onChange={(event) => setAddQty(event.target.value)}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        Subtotal {formatTaka(order.subtotal)} · Discount {formatTaka(order.discount)} ·
        Delivery {formatTaka(order.deliveryCharge)} · Total {formatTaka(order.total)}
      </p>
      <Button className="mt-3" isLoading={pending} onClick={() => void save()}>
        Save items
      </Button>
    </section>
  );
}
