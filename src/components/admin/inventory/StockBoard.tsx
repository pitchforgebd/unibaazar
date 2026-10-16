"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adjustStockAction,
  barcodesAction,
  warehouseAction,
} from "@/app/(admin)/admin/inventory-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import type { StockQuery, StockRow, WarehouseRow } from "@/server/admin/inventory";

function listHref(query: StockQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.level) params.set("level", query.level);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/inventory?${text}` : "/admin/inventory";
}

export function StockBoard({
  rows,
  query,
  page,
  pages,
  total,
  out,
  low,
  warehouses,
}: {
  rows: StockRow[];
  query: StockQuery;
  page: number;
  pages: number;
  total: number;
  out: number;
  low: number;
  warehouses: WarehouseRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sku, setSku] = useState("");
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("ADJUSTMENT");
  const [note, setNote] = useState("");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((row) => row.isDefault)?.id ?? "",
  );
  const [code, setCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");

  async function run(
    task: () => Promise<{ ok: boolean; message: string }>,
    refresh: boolean,
  ): Promise<void> {
    setPending(true);
    const result = await task();
    setMessage(result.message);
    setPending(false);
    if (result.ok && refresh) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Stock</h1>
        <p className="text-sm text-muted">
          {out} out of stock · {low} low · {total} shown
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Search</span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Product or SKU"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Alert</span>
          <select name="level" defaultValue={query.level} className={fieldClass}>
            <option value="">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClass()}>
            Apply
          </button>
          <Link href="/admin/inventory" className={buttonClass("outline")}>
            Clear
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass("outline")}
          disabled={pending}
          onClick={() => {
            if (selected.length === 0) {
              setMessage("Select at least one variant.");
              return;
            }
            void run(() => barcodesAction({ ids: selected }), true);
          }}
        >
          Assign barcodes
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
          onClick={() => {
            if (selected.length === 0) {
              setMessage("Select at least one variant.");
              return;
            }
            router.push(`/admin/inventory/labels?ids=${selected.join(",")}`);
          }}
        >
          Print labels
        </button>
      </div>
      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all variants"
                  checked={
                    rows.length > 0 && rows.every((row) => selected.includes(row.id))
                  }
                  onChange={() =>
                    setSelected(
                      rows.every((row) => selected.includes(row.id))
                        ? []
                        : rows.map((row) => row.id),
                    )
                  }
                />
              </th>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">Stock</th>
              <th className="px-3 py-3 font-semibold">Alert</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  No variants match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.sku}`}
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(row.id)
                            ? current.filter((id) => id !== row.id)
                            : [...current, row.id],
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">
                      {row.sku}
                      {row.barcode ? ` · ${row.barcode}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">{row.stock}</td>
                  <td className="px-3 py-3">
                    {row.level === "out"
                      ? "Out of stock"
                      : row.level === "low"
                        ? `Low · threshold ${row.threshold}`
                        : "In stock"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={listHref(query, page - 1)} className={buttonClass("outline")}>
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={listHref(query, page + 1)} className={buttonClass("outline")}>
              Next
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => adjustStockAction({ sku, change, reason, note, warehouseId }),
              true,
            );
          }}
        >
          <h2 className="font-semibold text-ink">Adjust stock</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">SKU</span>
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Change</span>
            <input
              value={change}
              onChange={(event) => setChange(event.target.value)}
              placeholder="5 or -2"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={fieldClass}
            >
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="PURCHASE">Purchase</option>
              <option value="RETURN">Return</option>
              <option value="SALE">Sale</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Warehouse</span>
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className={fieldClass}
            >
              <option value="">No warehouse</option>
              {warehouses.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Note</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button type="submit" className={buttonClass()} disabled={pending}>
            Save adjustment
          </button>
        </form>
        <form
          className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => warehouseAction({ code, name: warehouseName }), true);
          }}
        >
          <h2 className="font-semibold text-ink">Warehouses</h2>
          {warehouses.length === 0 ? (
            <p className="text-sm text-muted">
              No warehouse yet. The first one becomes the default for received purchases.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {warehouses.map((row) => (
                <li key={row.id}>
                  {row.name} ({row.code}){row.isDefault ? " · Default" : ""}
                </li>
              ))}
            </ul>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Name</span>
            <input
              value={warehouseName}
              onChange={(event) => setWarehouseName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button type="submit" className={buttonClass("outline")} disabled={pending}>
            Save warehouse
          </button>
        </form>
      </section>
    </div>
  );
}
