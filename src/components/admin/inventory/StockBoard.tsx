"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { barcodesAction } from "@/app/(admin)/admin/inventory-actions";
import { StockAdjustForms } from "@/components/admin/inventory/StockAdjustForms";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
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
  const push = useToastStore((state) => state.push);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

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
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          label="Search"
          containerClassName="sm:col-span-2"
          name="q"
          defaultValue={query.q}
          placeholder="Product or SKU"
        />
        <Select label="Alert" name="level" defaultValue={query.level}>
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Link href="/admin/inventory" className={buttonStyles({ variant: "outline" })}>
            Clear
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          isLoading={pending}
          onClick={() => {
            if (selected.length === 0) {
              push({ message: "Select at least one variant.", type: "error" });
              return;
            }
            setPending(true);
            void barcodesAction({ ids: selected }).then((result) => {
              setPending(false);
              push({ message: result.message, type: result.ok ? "success" : "error" });
              if (result.ok) router.refresh();
            });
          }}
        >
          Assign barcodes
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (selected.length === 0) {
              push({ message: "Select at least one variant.", type: "error" });
              return;
            }
            router.push(`/admin/inventory/labels?ids=${selected.join(",")}`);
          }}
        >
          Print labels
        </Button>
      </div>

      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3">
                <Checkbox
                  label={<span className="sr-only">Select all variants</span>}
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
                    <Checkbox
                      label={<span className="sr-only">Select {row.sku}</span>}
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
                    {row.level === "out" ? (
                      <Badge variant="primary">Out of stock</Badge>
                    ) : row.level === "low" ? (
                      <Badge variant="outline">Low · threshold {row.threshold}</Badge>
                    ) : (
                      <Badge variant="success">In stock</Badge>
                    )}
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
            <Link
              href={listHref(query, page - 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={listHref(query, page + 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>

      <StockAdjustForms warehouses={warehouses} />
    </div>
  );
}
