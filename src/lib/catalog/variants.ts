import type { Product, ProductVariant } from "@/types/catalog";
import {
  generateVariantsSchema,
  variantBulkEditSchema,
  type GenerateVariantsInput,
  type VariantBulkEditInput,
} from "@/lib/validation/variants";

export type VariantDraft = {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  costPrice: number | null;
  stock: number;
  imageHue: number;
  attributes: Record<string, string>;
};

export type VariantResult<T> = { ok: true; variants: T } | { ok: false; message: string };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Check the variant details";
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function skuPart(label: string, skuCode?: string): string {
  const source = skuCode ?? label;
  return source.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
}

export function selectionKey(attributes: Record<string, string>): string {
  return Object.keys(attributes)
    .sort()
    .map((name) => `${name}=${attributes[name]}`)
    .join("|");
}

export function createSimpleVariant(input: {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  imageHue: number;
}): ProductVariant {
  return {
    id: input.id,
    sku: input.sku,
    price: input.price,
    salePrice: input.salePrice,
    stock: input.stock,
    imageHue: input.imageHue,
    image: null,
    attributes: {},
  };
}

export function findVariant(
  product: Product,
  selected: Record<string, string>,
): ProductVariant | null {
  return (
    product.variants.find((variant) =>
      product.attributes.every(
        (attribute) => variant.attributes[attribute.name] === selected[attribute.name],
      ),
    ) ?? null
  );
}

export const resolveVariant = findVariant;

type Combination = {
  selection: Record<string, string>;
  skuParts: string[];
};

function combinations(attributes: GenerateVariantsInput["attributes"]): Combination[] {
  let rows: Combination[] = [{ selection: {}, skuParts: [] }];
  for (const attribute of attributes) {
    const next: Combination[] = [];
    for (const row of rows) {
      for (const value of attribute.values) {
        next.push({
          selection: { ...row.selection, [attribute.name]: value.label },
          skuParts: [...row.skuParts, skuPart(value.label, value.skuCode)],
        });
      }
    }
    rows = next;
  }
  return rows;
}

export function generateVariantCombinations(
  input: GenerateVariantsInput,
  existing: VariantDraft[] = [],
): VariantResult<VariantDraft[]> {
  const parsed = generateVariantsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) };
  }

  const kept = new Map(
    existing.map((variant) => [selectionKey(variant.attributes), variant]),
  );
  const prefix = parsed.data.skuPrefix.toUpperCase();
  const variants = combinations(parsed.data.attributes).map((combo) => {
    const previous = kept.get(selectionKey(combo.selection));
    if (previous) {
      return { ...previous, attributes: combo.selection };
    }
    const sku = [prefix, ...combo.skuParts].join("-");
    const id = [
      slug(prefix),
      ...Object.entries(combo.selection).map(
        ([name, label]) => `${slug(name)}-${slug(label)}`,
      ),
    ].join("-");
    return {
      id,
      sku,
      price: parsed.data.basePrice,
      salePrice: parsed.data.salePrice,
      costPrice: parsed.data.costPrice,
      stock: parsed.data.stock,
      imageHue: parsed.data.imageHue ?? 0,
      attributes: combo.selection,
    };
  });

  return { ok: true, variants };
}

export function applyVariantBulkEdit(
  variants: VariantDraft[],
  input: VariantBulkEditInput,
): VariantResult<VariantDraft[]> {
  const parsed = variantBulkEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) };
  }

  const selected = new Set(parsed.data.variantIds);
  const known = new Set(variants.map((variant) => variant.id));
  for (const id of selected) {
    if (!known.has(id)) {
      return { ok: false, message: "One of the selected variants was not found" };
    }
  }

  const next = variants.map((variant) => {
    if (!selected.has(variant.id)) {
      return variant;
    }
    return {
      ...variant,
      price: parsed.data.price ?? variant.price,
      salePrice:
        parsed.data.salePrice === undefined ? variant.salePrice : parsed.data.salePrice,
      costPrice:
        parsed.data.costPrice === undefined ? variant.costPrice : parsed.data.costPrice,
      stock: parsed.data.stock ?? variant.stock,
    };
  });

  const invalid = next.find(
    (variant) =>
      selected.has(variant.id) &&
      variant.salePrice !== null &&
      variant.salePrice > variant.price,
  );
  if (invalid) {
    return {
      ok: false,
      message: `Sale price is higher than the price for ${invalid.sku}`,
    };
  }

  return { ok: true, variants: next };
}
