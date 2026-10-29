"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import { useRouter } from "@/i18n/navigation";
import { shopHref } from "@/lib/catalog/queries";
import type { ShopQuery, ShopSort } from "@/types/catalog";

type SortSelectProps = {
  basePath: string;
  query: ShopQuery;
};

export function SortSelect({ basePath, query }: SortSelectProps) {
  const router = useRouter();
  const t = useTranslations("shop");

  const options: { value: ShopSort; label: string }[] = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
    { value: "rating", label: t("sortTopRated") },
    { value: "name", label: t("sortName") },
  ];

  return (
    <Select
      label={t("sortProductsAria")}
      hideLabel
      value={query.sort}
      containerClassName="w-44 sm:w-52"
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
    </Select>
  );
}
