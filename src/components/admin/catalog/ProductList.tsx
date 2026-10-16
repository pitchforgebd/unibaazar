"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bulkProductsAction,
  duplicateProductAction,
  quickEditAction,
} from "@/app/(admin)/admin/catalog-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
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
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [quickId, setQuickId] = useState("");
  const [action, setAction] = useState("publish");
  const [priceMode, setPriceMode] = useState<"set" | "percent" | "amount">("percent");
  const [priceValue, setPriceValue] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [categoryMode, setCategoryMode] = useState<"add" | "replace">("add");

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  async function runBulk() {
    if (selected.length === 0) {
      setMessage("Select at least one product.");
      return;
    }
    if (action === "delete" && !window.confirm("Delete the selected products?")) {
      return;
    }
    setPending(true);
    const payload =
      action === "price"
        ? { action, ids: selected, mode: priceMode, value: Number(priceValue) }
        : action === "category"
          ? { action, ids: selected, categoryId, mode: categoryMode }
          : { action, ids: selected };
    const result = await bulkProductsAction(payload);
    setMessage(result.message);
    setPending(false);
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/products/export${listHref(query, 1).replace("/admin/products", "")}`}
            className={buttonClass("outline")}
          >
            Export CSV
          </Link>
          <Link href="/admin/products/import" className={buttonClass("outline")}>
            Import
          </Link>
          <Link href="/admin/products/new" className={buttonClass()}>
            Add product
          </Link>
        </div>
      </div>
      <form
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6"
        action="/admin/products"
      >
        <input
          className={fieldClass}
          name="q"
          defaultValue={query.q}
          placeholder="Name, slug, or SKU"
          aria-label="Search products"
        />
        <select
          className={fieldClass}
          name="brand"
          defaultValue={query.brandId}
          aria-label="Brand"
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          name="category"
          defaultValue={query.categoryId}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {`${" ".repeat(category.depth * 2)}${category.name}`}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          name="status"
          defaultValue={query.status}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
        <select
          className={fieldClass}
          name="stock"
          defaultValue={query.stock}
          aria-label="Stock"
        >
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button className={buttonClass("ink")} type="submit">
          Filter
        </button>
      </form>
      <p className="text-sm text-muted">
        {total} {total === 1 ? "product" : "products"}
      </p>
      {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-card p-4 shadow-soft">
        <label className="text-sm">
          <span className="font-semibold">Bulk action</span>
          <select
            className={`${fieldClass} mt-1`}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="publish">Publish</option>
            <option value="delete">Delete</option>
            <option value="price">Update price</option>
            <option value="category">Change category</option>
          </select>
        </label>
        {action === "price" ? (
          <>
            <select
              className={fieldClass}
              value={priceMode}
              onChange={(event) =>
                setPriceMode(event.target.value as "set" | "percent" | "amount")
              }
              aria-label="Price change"
            >
              <option value="percent">Percent</option>
              <option value="amount">Add amount</option>
              <option value="set">Set price</option>
            </select>
            <input
              className={fieldClass}
              value={priceValue}
              onChange={(event) => setPriceValue(event.target.value)}
              inputMode="decimal"
              aria-label="Price value"
              placeholder="-10 or 100"
            />
          </>
        ) : null}
        {action === "category" ? (
          <>
            <select
              className={fieldClass}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label="Bulk category"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={categoryMode}
              onChange={(event) =>
                setCategoryMode(event.target.value as "add" | "replace")
              }
              aria-label="Category mode"
            >
              <option value="add">Add</option>
              <option value="replace">Replace</option>
            </select>
          </>
        ) : null}
        <button
          className={buttonClass("outline")}
          type="button"
          disabled={pending}
          onClick={() => void runBulk()}
        >
          Apply
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  aria-label="Select all products on this page"
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
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    aria-label={`Select ${row.name}`}
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
                    <QuickEdit
                      row={row}
                      onClose={() => setQuickId("")}
                      onDone={(text) => {
                        setMessage(text);
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
                    <span className="ml-2 text-xs font-semibold text-primary">Low</span>
                  ) : null}
                </td>
                <td className="p-3">{statusLabel(row.status)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
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
                          setMessage(result.message);
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
        <div className="flex gap-3 text-sm">
          {page > 1 ? <Link href={listHref(query, page - 1)}>Previous</Link> : null}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={listHref(query, page + 1)}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function QuickEdit({
  row,
  onClose,
  onDone,
}: {
  row: AdminProductRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [status, setStatus] = useState(row.status);
  const [price, setPrice] = useState(String(row.price));
  const [stock, setStock] = useState(String(row.stock));
  const [error, setError] = useState("");

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void quickEditAction({ id: row.id, name, status, price, stock }).then(
          (result) => {
            if (!result.ok) {
              setError(result.message);
              return;
            }
            onDone(result.message);
          },
        );
      }}
    >
      <input
        className={fieldClass}
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Name"
      />
      <select
        className={fieldClass}
        value={status}
        onChange={(event) => setStatus(event.target.value as AdminProductRow["status"])}
        aria-label="Status"
      >
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="SCHEDULED">Scheduled</option>
      </select>
      <input
        className={fieldClass}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        inputMode="decimal"
        aria-label="Price"
      />
      <input
        className={fieldClass}
        value={stock}
        onChange={(event) => setStock(event.target.value)}
        inputMode="numeric"
        aria-label="Stock"
      />
      {error ? <p className="text-xs text-primary">{error}</p> : null}
      <div className="flex gap-2">
        <button className={buttonClass()} type="submit">
          Save
        </button>
        <button className={buttonClass("outline")} type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
