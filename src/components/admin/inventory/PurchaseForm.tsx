"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseAction } from "@/app/(admin)/admin/inventory-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type Line = { sku: string; qty: string; cost: string };

export function PurchaseForm({
  suppliers,
}: {
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ sku: "", qty: "1", cost: "0" }]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void purchaseAction({ supplierId, notes, lines }).then((result) => {
          setMessage(result.message);
          setPending(false);
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
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Supplier</span>
          <select
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className={fieldClass}
          >
            {suppliers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-ink">SKU</span>
              <input
                value={line.sku}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, sku: event.target.value } : row,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-ink">Quantity</span>
              <input
                value={line.qty}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, qty: event.target.value } : row,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-ink">Cost</span>
              <input
                value={line.cost}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, cost: event.target.value } : row,
                    ),
                  )
                }
                className={fieldClass}
              />
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={buttonClass("outline")}
        onClick={() =>
          setLines((current) => [...current, { sku: "", qty: "1", cost: "0" }])
        }
      >
        Add line
      </button>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">Notes</span>
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={fieldClass}
        />
      </label>
      <button
        type="submit"
        className={buttonClass()}
        disabled={pending || suppliers.length === 0}
      >
        Save draft
      </button>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </form>
  );
}
