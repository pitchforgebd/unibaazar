"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adjustStockAction,
  warehouseAction,
} from "@/app/(admin)/admin/inventory-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import type { WarehouseRow } from "@/server/admin/inventory";

export function StockAdjustForms({ warehouses }: { warehouses: WarehouseRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [adjustPending, setAdjustPending] = useState(false);
  const [warehousePending, setWarehousePending] = useState(false);
  const [sku, setSku] = useState("");
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("ADJUSTMENT");
  const [note, setNote] = useState("");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((row) => row.isDefault)?.id ?? "",
  );
  const [code, setCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setAdjustPending(true);
          void adjustStockAction({ sku, change, reason, note, warehouseId }).then(
            (result) => {
              setAdjustPending(false);
              push({ message: result.message, type: result.ok ? "success" : "error" });
              if (result.ok) router.refresh();
            },
          );
        }}
      >
        <h2 className="font-heading font-semibold text-ink">Adjust stock</h2>
        <Input label="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
        <Input
          label="Change"
          value={change}
          onChange={(event) => setChange(event.target.value)}
          placeholder="5 or -2"
        />
        <Select
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="PURCHASE">Purchase</option>
          <option value="RETURN">Return</option>
          <option value="SALE">Sale</option>
        </Select>
        <Select
          label="Warehouse"
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
        >
          <option value="">No warehouse</option>
          {warehouses.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        <Input
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" isLoading={adjustPending}>
          Save adjustment
        </Button>
      </form>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setWarehousePending(true);
          void warehouseAction({ code, name: warehouseName }).then((result) => {
            setWarehousePending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) router.refresh();
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">Warehouses</h2>
        {warehouses.length === 0 ? (
          <p className="text-sm text-muted">
            No warehouse yet. The first one becomes the default for received purchases.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {warehouses.map((row) => (
              <li key={row.id}>
                {row.name} ({row.code}){row.isDefault ? " · Default" : ""}
              </li>
            ))}
          </ul>
        )}
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Input
          label="Name"
          value={warehouseName}
          onChange={(event) => setWarehouseName(event.target.value)}
        />
        <Button type="submit" variant="outline" isLoading={warehousePending}>
          Save warehouse
        </Button>
      </form>
    </section>
  );
}
