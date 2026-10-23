import { describe, expect, it } from "vitest";
import { aggregateStockValuation } from "./reports";

describe("aggregateStockValuation", () => {
  it("groups by category and sums stock times cost price", () => {
    const { columns, rows } = aggregateStockValuation([
      { categoryName: "Phones", stock: 10, costPrice: 500 },
      { categoryName: "Phones", stock: 5, costPrice: 1000 },
      { categoryName: "Cables", stock: 100, costPrice: 20 },
    ]);
    expect(columns).toEqual([
      "Category",
      "Variants",
      "Units in stock",
      "Valuation (BDT)",
    ]);
    const phones = rows.find((row) => row[0] === "Phones");
    const cables = rows.find((row) => row[0] === "Cables");
    const total = rows.find((row) => row[0] === "Total");
    // Phones: 10*500 + 5*1000 = 10000
    expect(phones).toEqual(["Phones", "2", "15", "10000"]);
    // Cables: 100*20 = 2000
    expect(cables).toEqual(["Cables", "1", "100", "2000"]);
    // Total valuation: 10000 + 2000 = 12000, total variants 3, total units 115
    expect(total).toEqual(["Total", "3", "115", "12000"]);
  });

  it("sorts rows by valuation, highest first, before the total row", () => {
    const { rows } = aggregateStockValuation([
      { categoryName: "Low value", stock: 1, costPrice: 10 },
      { categoryName: "High value", stock: 1, costPrice: 1000 },
    ]);
    expect(rows[0]?.[0]).toBe("High value");
    expect(rows[1]?.[0]).toBe("Low value");
    expect(rows[2]?.[0]).toBe("Total");
  });

  it("treats a missing cost price as zero rather than falling back to a selling price", () => {
    const { rows } = aggregateStockValuation([
      { categoryName: "No cost set", stock: 50, costPrice: null },
    ]);
    expect(rows).toEqual([
      ["No cost set", "1", "50", "0"],
      ["Total", "1", "50", "0"],
    ]);
  });

  it("returns just the total row for an empty catalogue", () => {
    const { rows } = aggregateStockValuation([]);
    expect(rows).toEqual([["Total", "0", "0", "0"]]);
  });
});
