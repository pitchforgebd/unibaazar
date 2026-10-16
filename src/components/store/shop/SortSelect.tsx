"use client";

import { useRouter } from "next/navigation";
import { shopHref } from "@/lib/catalog/queries";
import type { ShopQuery, ShopSort } from "@/types/catalog";

const options: { value: ShopSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Name" },
];

type SortSelectProps = {
  basePath: string;
  query: ShopQuery;
};

export function SortSelect({ basePath, query }: SortSelectProps) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Sort
      <select
        aria-label="Sort products"
        value={query.sort}
        className="h-10 rounded-md border border-black/10 bg-card px-2 text-sm text-foreground"
        onChange={(event) => {
          const sort = options.find((item) => item.value === event.target.value)?.value;
          if (!sort) {
            return;
          }
          router.push(shopHref(basePath, query, { sort, page: 1 }));
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
