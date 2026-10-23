import type { ShopQuery } from "@/types/catalog";

/**
 * How many filter choices are applied, for the mobile "Filters" trigger's
 * badge. Each checked option counts once; a price range counts once however
 * many of its bounds are set. Sort, page, and the search text aren't
 * filters, so they never count.
 */
export function activeFilterCount(query: ShopQuery): number {
  const hasPriceRange = query.minPrice !== undefined || query.maxPrice !== undefined;
  return (
    query.categories.length +
    query.brands.length +
    query.sizes.length +
    query.colors.length +
    (hasPriceRange ? 1 : 0) +
    (query.rating ? 1 : 0) +
    (query.availability ? 1 : 0)
  );
}
