"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseAction } from "@/app/(admin)/admin/inventory-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";

type Line = { sku: string; qty: string; cost: string };

export function PurchaseForm({
  suppliers,
}: {
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ sku: "", qty: "1", cost: "0" }]);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void purchaseAction({ supplierId, notes, lines }).then((result) => {
          setPending(false);
          push({ message: result.message, type: result.ok ? "success" : "error" });
          if (result.ok && result.id) {
            router.push(`/admin/inventory/purchases/${result.id}`);
          }
        });
      }}
    >
      <h1 className="text-2xl font-bold text-ink">New purchase</h1>
      {suppliers.length === 0 ? (
        <p className="text-sm text-muted">Add a supplier before creating a purchase.</p>
      ) : (
        <Select
          label="Supplier"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          {suppliers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
      )}
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-3"
          >
            <Input
              label="SKU"
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
              label="Quantity"
              value={line.qty}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, qty: event.target.value } : row,
                  ),
                )
              }
            />
            <Input
              label="Cost"
              value={line.cost}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, cost: event.target.value } : row,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setLines((current) => [...current, { sku: "", qty: "1", cost: "0" }])
        }
      >
        Add line
      </Button>
      <Input
        label="Notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <Button type="submit" isLoading={pending} disabled={suppliers.length === 0}>
        Save draft
      </Button>
    </form>
  );
}
