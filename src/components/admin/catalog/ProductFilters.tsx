"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductListQuery } from "@/server/admin/products";

export function ProductFilters({
  query,
  categories,
  brands,
}: {
  query: ProductListQuery;
  categories: { id: string; name: string; depth: number }[];
  brands: { id: string; name: string }[];
}) {
  return (
    <form
      className="grid gap-3 rounded-theme bg-card p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6"
      action="/admin/products"
    >
      <Input
        label="Search products"
        hideLabel
        name="q"
        defaultValue={query.q}
        placeholder="Name, slug, or SKU"
      />
      <Select label="Brand" hideLabel name="brand" defaultValue={query.brandId}>
        <option value="">All brands</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </Select>
      <Select label="Category" hideLabel name="category" defaultValue={query.categoryId}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {`${" ".repeat(category.depth * 2)}${category.name}`}
          </option>
        ))}
      </Select>
      <Select label="Status" hideLabel name="status" defaultValue={query.status}>
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="SCHEDULED">Scheduled</option>
      </Select>
      <Select label="Stock" hideLabel name="stock" defaultValue={query.stock}>
        <option value="">Any stock</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </Select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
