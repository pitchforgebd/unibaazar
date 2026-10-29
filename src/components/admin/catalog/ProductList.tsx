"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { duplicateProductAction } from "@/app/(admin)/admin/catalog-actions";
import { ProductBulkBar } from "@/components/admin/catalog/ProductBulkBar";
import { ProductFilters } from "@/components/admin/catalog/ProductFilters";
import { ProductQuickEdit } from "@/components/admin/catalog/ProductQuickEdit";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { useToastStore } from "@/store/toast";
import { formatTaka } from "@/lib/utils/currency";
import type { AdminProductRow, ProductListQuery } from "@/server/admin/products";

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function listHref(query: ProductListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("category", query.categoryId);
  if (query.brandId) params.set("brand", query.brandId);
  if (query.status) params.set("status", query.status);
  if (query.stock) params.set("stock", query.stock);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/products?${text}` : "/admin/products";
}

export function ProductList({
  rows,
  query,
  page,
  pages,
  total,
  categories,
  brands,
}: {
  rows: AdminProductRow[];
  query: ProductListQuery;
  page: number;
  pages: number;
  total: number;
  categories: { id: string; name: string; depth: number }[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [selected, setSelected] = useState<string[]>([]);
  const [quickId, setQuickId] = useState("");

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/products/export${listHref(query, 1).replace("/admin/products", "")}`}
            className={buttonStyles({ variant: "outline" })}
          >
            Export CSV
          </Link>
          <Link
            href="/admin/products/import"
            className={buttonStyles({ variant: "outline" })}
          >
            Import
          </Link>
          <Link href="/admin/products/new" className={buttonStyles()}>
            Add product
          </Link>
        </div>
      </div>
      <ProductFilters query={query} categories={categories} brands={brands} />
      <p className="text-sm text-muted">
        {total} {total === 1 ? "product" : "products"}
      </p>
      <ProductBulkBar
        selected={selected}
        categories={categories}
        onDone={() => setSelected([])}
      />
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="p-3">
                <Checkbox
                  label={
                    <span className="sr-only">Select all products on this page</span>
                  }
                  checked={allChecked}
                  onChange={(event) =>
                    setSelected(event.target.checked ? rows.map((row) => row.id) : [])
                  }
                />
              </th>
              <th className="p-3 font-semibold">Product</th>
              <th className="p-3 font-semibold">SKU</th>
              <th className="p-3 font-semibold">Price</th>
              <th className="p-3 font-semibold">Stock</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 align-top">
                <td className="p-3">
                  <Checkbox
                    label={<span className="sr-only">Select {row.name}</span>}
                    checked={selected.includes(row.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((id) => id !== row.id),
                      )
                    }
                  />
                </td>
                <td className="p-3">
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">{row.categories || row.brand}</p>
                  {quickId === row.id ? (
                    <ProductQuickEdit
                      row={row}
                      onClose={() => setQuickId("")}
                      onDone={(message) => {
                        push({ message, type: "success" });
                        setQuickId("");
                        router.refresh();
                      }}
                    />
                  ) : null}
                </td>
                <td className="p-3">{row.sku}</td>
                <td className="p-3">{formatTaka(row.price)}</td>
                <td className="p-3">
                  {row.stock}
                  {row.low ? (
                    <Badge variant="primary" className="ml-2">
                      Low
                    </Badge>
                  ) : null}
                </td>
                <td className="p-3">{statusLabel(row.status)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/products/${row.id}`}
                      className="font-semibold text-primary"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="font-semibold text-ink"
                      onClick={() => setQuickId(row.id)}
                    >
                      Quick edit
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-ink"
                      onClick={() => {
                        void duplicateProductAction(row.id).then((result) => {
                          push({
                            message: result.message,
                            type: result.ok ? "success" : "error",
                          });
                          if (result.ok && result.id) {
                            router.push(`/admin/products/${result.id}`);
                          }
                        });
                      }}
                    >
                      Duplicate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-muted" colSpan={7}>
                  No products match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={listHref(query, page - 1)} className="font-semibold text-primary">
              Previous
            </Link>
          ) : null}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={listHref(query, page + 1)} className="font-semibold text-primary">
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
