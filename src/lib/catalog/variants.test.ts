import assert from "node:assert/strict";
import { products } from "@/lib/mock/catalog";
import {
  applyVariantBulkEdit,
  generateVariantCombinations,
  resolveVariant,
  type VariantDraft,
} from "@/lib/catalog/variants";

const tee = products.find((product) => product.slug === "cotton-crew-tshirt");
assert.ok(tee);

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

if (!generated.ok) {
  throw new Error(generated.message);
}
assert.deepEqual(
  generated.variants.map((variant) => variant.sku),
  ["TEE-S-BLK", "TEE-S-WHT", "TEE-M-BLK", "TEE-M-WHT", "TEE-L-BLK", "TEE-L-WHT"],
);

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
if (!kept.ok) {
  throw new Error(kept.message);
}
const blackLarge = kept.variants.find((variant) => variant.sku === "TEE-L-BLK");
const extra = kept.variants.find(
  (variant) => variant.attributes.Size === "XL" && variant.attributes.Color === "Black",
);
assert.equal(blackLarge?.stock, 0);
assert.equal(blackLarge?.id, "tee-l-black");
assert.equal(extra?.stock, 99);
assert.equal(extra?.salePrice, 690);
assert.equal(kept.variants.length, 8);

const edited = applyVariantBulkEdit(generated.variants, {
  variantIds: ["tee-size-s-color-black", "tee-size-s-color-white"],
  stock: 4,
  salePrice: null,
});
if (!edited.ok) {
  throw new Error(edited.message);
}
assert.equal(edited.variants[0]?.stock, 4);
assert.equal(edited.variants[0]?.salePrice, null);
assert.equal(edited.variants[1]?.salePrice, null);
assert.equal(edited.variants[2]?.stock, 10);

const rejected = applyVariantBulkEdit(generated.variants, {
  variantIds: [generated.variants[0]?.id ?? ""],
  salePrice: 1000,
});
assert.equal(rejected.ok, false);

const whiteLarge = resolveVariant(tee, { Size: "L", Color: "White" });
assert.equal(whiteLarge?.sku, "TEE-L-WHT");
assert.equal(whiteLarge?.salePrice, 750);
assert.equal(whiteLarge?.stock, 3);

const missing = resolveVariant(tee, { Size: "L", Color: "Red" });
assert.equal(missing, null);

const buds = products.find((product) => product.slug === "redmi-buds-4");
assert.equal(buds?.variants.length, 1);
assert.deepEqual(buds?.variants[0]?.attributes, {});

const duplicate = generateVariantCombinations({
  skuPrefix: "TEE",
  basePrice: 890,
  salePrice: null,
  costPrice: null,
  stock: 1,
  imageHue: null,
  attributes: [{ name: "Size", values: [{ label: "M" }, { label: "M" }] }],
});
assert.equal(duplicate.ok, false);

console.log("variant checks passed");
