import { describe, expect, it } from "vitest";
import { parseShopQuery } from "@/lib/catalog/queries";
import { activeFilterCount } from "./activeFilters";

describe("activeFilterCount", () => {
  it("is zero for an unfiltered listing, even with sort, page, and search text", () => {
    expect(
      activeFilterCount(parseShopQuery({ sort: "price-asc", page: "3", q: "shirt" })),
    ).toBe(0);
  });

  it("counts every checked option individually", () => {
    const query = parseShopQuery({
      category: ["fashion", "electronics"],
      brand: "acme",
      size: ["M", "L"],
      color: "Red",
    });
    expect(activeFilterCount(query)).toBe(6);
  });

  it("counts a price range once whether one or both bounds are set", () => {
    expect(activeFilterCount(parseShopQuery({ min: "100" }))).toBe(1);
    expect(activeFilterCount(parseShopQuery({ max: "900" }))).toBe(1);
    expect(activeFilterCount(parseShopQuery({ min: "100", max: "900" }))).toBe(1);
  });

  it("counts a minimum rating and an availability choice", () => {
    expect(activeFilterCount(parseShopQuery({ rating: "4", availability: "in" }))).toBe(
      2,
    );
  });

  it("ignores the empty 'any' radio values the filter form submits", () => {
    expect(activeFilterCount(parseShopQuery({ rating: "", availability: "" }))).toBe(0);
  });
});
