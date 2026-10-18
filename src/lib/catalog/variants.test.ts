import { describe, expect, it } from "vitest";
import { products } from "@/lib/mock/catalog";
import {
  applyVariantBulkEdit,
  generateVariantCombinations,
  resolveVariant,
  type VariantDraft,
} from "@/lib/catalog/variants";

const tee = products.find((product) => product.slug === "cotton-crew-tshirt");
if (!tee) {
  throw new Error("fixture product cotton-crew-tshirt missing from mock catalog");
}

describe("generateVariantCombinations", () => {
  it("builds one SKU per attribute combination, in order", () => {
    const generated = generateVariantCombinations({
      skuPrefix: "TEE",
      basePrice: 890,
      salePrice: 690,
      costPrice: 400,
      stock: 10,
      imageHue: 0,
      attributes: [
        {
          name: "Size",
          values: [
            { label: "S", skuCode: "S" },
            { label: "M", skuCode: "M" },
            { label: "L", skuCode: "L" },
          ],
        },
        {
          name: "Color",
          values: [
            { label: "Black", skuCode: "BLK" },
            { label: "White", skuCode: "WHT" },
          ],
        },
      ],
    });

    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error(generated.message);
    expect(generated.variants.map((variant) => variant.sku)).toEqual([
      "TEE-S-BLK",
      "TEE-S-WHT",
      "TEE-M-BLK",
      "TEE-M-WHT",
      "TEE-L-BLK",
      "TEE-L-WHT",
    ]);
  });

  it("preserves existing variant stock/id/price when regenerating with a new attribute value", () => {
    const existing: VariantDraft[] = tee.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      salePrice: variant.salePrice,
      costPrice: null,
      stock: variant.stock,
      imageHue: variant.imageHue,
      attributes: variant.attributes,
    }));

    const kept = generateVariantCombinations(
      {
        skuPrefix: "TEE",
        basePrice: 890,
        salePrice: 690,
        costPrice: 400,
        stock: 99,
        imageHue: 0,
        attributes: [
          {
            name: "Size",
            values: [{ label: "S" }, { label: "M" }, { label: "L" }, { label: "XL" }],
          },
          {
            name: "Color",
            values: [
              { label: "Black", skuCode: "BLK" },
              { label: "White", skuCode: "WHT" },
            ],
          },
        ],
      },
      existing,
    );

    expect(kept.ok).toBe(true);
    if (!kept.ok) throw new Error(kept.message);

    const blackLarge = kept.variants.find((variant) => variant.sku === "TEE-L-BLK");
    const extra = kept.variants.find(
      (variant) =>
        variant.attributes.Size === "XL" && variant.attributes.Color === "Black",
    );
    expect(blackLarge?.stock).toBe(0);
    expect(blackLarge?.id).toBe("tee-l-black");
    expect(extra?.stock).toBe(99);
    expect(extra?.salePrice).toBe(690);
    expect(kept.variants.length).toBe(8);
  });

  it("rejects duplicate attribute values", () => {
    const duplicate = generateVariantCombinations({
      skuPrefix: "TEE",
      basePrice: 890,
      salePrice: null,
      costPrice: null,
      stock: 1,
      imageHue: null,
      attributes: [{ name: "Size", values: [{ label: "M" }, { label: "M" }] }],
    });
    expect(duplicate.ok).toBe(false);
  });
});

describe("applyVariantBulkEdit", () => {
  it("applies stock/salePrice edits only to the selected variant ids", () => {
    const generated = generateVariantCombinations({
      skuPrefix: "TEE",
      basePrice: 890,
      salePrice: 690,
      costPrice: 400,
      stock: 10,
      imageHue: 0,
      attributes: [
        {
          name: "Size",
          values: [
            { label: "S", skuCode: "S" },
            { label: "M", skuCode: "M" },
            { label: "L", skuCode: "L" },
          ],
        },
        {
          name: "Color",
          values: [
            { label: "Black", skuCode: "BLK" },
            { label: "White", skuCode: "WHT" },
          ],
        },
      ],
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error(generated.message);

    const edited = applyVariantBulkEdit(generated.variants, {
      variantIds: ["tee-size-s-color-black", "tee-size-s-color-white"],
      stock: 4,
      salePrice: null,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) throw new Error(edited.message);
    expect(edited.variants[0]?.stock).toBe(4);
    expect(edited.variants[0]?.salePrice).toBe(null);
    expect(edited.variants[1]?.salePrice).toBe(null);
    expect(edited.variants[2]?.stock).toBe(10);

    const rejected = applyVariantBulkEdit(generated.variants, {
      variantIds: [generated.variants[0]?.id ?? ""],
      salePrice: 1000,
    });
    expect(rejected.ok).toBe(false);
  });
});

describe("resolveVariant", () => {
  it("finds the variant matching the given attribute selection", () => {
    const whiteLarge = resolveVariant(tee, { Size: "L", Color: "White" });
    expect(whiteLarge?.sku).toBe("TEE-L-WHT");
    expect(whiteLarge?.salePrice).toBe(750);
    expect(whiteLarge?.stock).toBe(3);
  });

  it("returns null when no variant matches", () => {
    const missing = resolveVariant(tee, { Size: "L", Color: "Red" });
    expect(missing).toBe(null);
  });

  it("handles a simple product with no attributes", () => {
    const buds = products.find((product) => product.slug === "redmi-buds-4");
    expect(buds?.variants.length).toBe(1);
    expect(buds?.variants[0]?.attributes).toEqual({});
  });
});
