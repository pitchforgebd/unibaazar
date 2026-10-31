import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount");

const optionalMoney = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
    "Enter a valid amount",
  );

const whole = z.string().trim().regex(/^\d+$/, "Enter a whole number");

const slug = z
  .string()
  .trim()
  .min(1, "Enter a slug")
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

export function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const productFormSchema = z
  .object({
    id: z.string().trim().max(191),
    name: z.string().trim().min(1, "Enter a product name").max(191),
    slug,
    type: z.enum(["SIMPLE", "VARIABLE"]),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
    brandId: z.string().trim().min(1, "Choose a brand"),
    unitId: z.string().trim(),
    categoryIds: z.array(z.string().trim().min(1)).max(20),
    labelIds: z.array(z.string().trim().min(1)).max(20),
    tags: z.string().max(400),
    shortDescription: z.string().max(20000),
    description: z.string().max(100000),
    warranty: z.string().max(20000),
    returns: z.string().max(20000),
    basePrice: money,
    saleStartsAt: z.string().trim(),
    saleEndsAt: z.string().trim(),
    publishedAt: z.string().trim(),
    lowStockThreshold: whole,
    weightGrams: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d+$/.test(value), "Enter a whole number"),
    lengthCm: optionalMoney,
    widthCm: optionalMoney,
    heightCm: optionalMoney,
    shippingClass: z.string().trim().max(64),
    videoUrl: z.string().trim().max(500),
    featured: z.boolean(),
    bestSeller: z.boolean(),
    isNew: z.boolean(),
    metaTitle: z.string().trim().max(191),
    metaDescription: z.string().trim().max(2000),
    canonical: z.string().trim().max(500),
    ogImage: z.string().trim().max(500),
    focusKeyword: z.string().trim().max(80),
    noIndex: z.boolean(),
    attributeIds: z.array(z.string().trim().min(1)).max(8),
    images: z
      .array(
        z.object({
          id: z.string().trim().max(191),
          url: z.string().trim().min(1, "Enter an image URL").max(500),
          alt: z.string().trim().max(191),
        }),
      )
      .max(12),
    variants: z
      .array(
        z.object({
          id: z.string().trim().max(191),
          sku: z.string().trim().min(1, "Enter a SKU").max(64),
          price: money,
          salePrice: optionalMoney,
          costPrice: optionalMoney,
          stock: whole,
          imageUrl: z.string().trim().max(500),
          status: z.enum(["ACTIVE", "INACTIVE"]),
          isDefault: z.boolean(),
          valueIds: z.array(z.string().trim().min(1)).max(8),
        }),
      )
      .min(1, "Add at least one variant")
      .max(100),
  })
  .superRefine((value, ctx) => {
    if (visibleText(value.shortDescription).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a short description",
        path: ["shortDescription"],
      });
    }
    if (visibleText(value.description).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a description",
        path: ["description"],
      });
    }
    if (value.categoryIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose at least one category",
        path: ["categoryIds"],
      });
    }
    if (value.status === "SCHEDULED" && value.publishedAt === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose when this product should publish",
        path: ["publishedAt"],
      });
    }
    if (Number(value.lowStockThreshold) > 100000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Low-stock threshold is too high",
        path: ["lowStockThreshold"],
      });
    }
    const skus = new Set<string>();
    value.variants.forEach((variant, index) => {
      const key = variant.sku.toLowerCase();
      if (skus.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each variant needs its own SKU",
          path: ["variants", index, "sku"],
        });
      }
      skus.add(key);
      if (variant.salePrice !== "" && Number(variant.salePrice) > Number(variant.price)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sale price cannot be higher than the price",
          path: ["variants", index, "salePrice"],
        });
      }
      if (Number(variant.stock) > 1000000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Stock is too high",
          path: ["variants", index, "stock"],
        });
      }
      if (value.type === "VARIABLE" && variant.valueIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each variant needs its options",
          path: ["variants", index, "valueIds"],
        });
      }
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  id: z.string().trim().max(191),
  name: z.string().trim().min(1, "Enter a category name").max(191),
  slug,
  parentId: z.string().trim(),
  description: z.string().trim().max(20000),
  seoText: z.string().trim().max(20000),
  imageHue: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 360),
      "Hue is 0 to 360",
    ),
  imageUrl: z.string().trim().max(500),
  sortOrder: whole,
  isActive: z.boolean(),
  metaTitle: z.string().trim().max(191),
  metaDescription: z.string().trim().max(2000),
  canonical: z.string().trim().max(500),
  ogImage: z.string().trim().max(500),
  focusKeyword: z.string().trim().max(80),
  noIndex: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const brandFormSchema = z.object({
  id: z.string().trim().max(191),
  name: z.string().trim().min(1, "Enter a brand name").max(191),
  slug,
  description: z.string().trim().max(20000),
  isActive: z.boolean(),
  metaTitle: z.string().trim().max(191),
  metaDescription: z.string().trim().max(2000),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

export const unitFormSchema = z.object({
  id: z.string().trim().max(191),
  name: z.string().trim().min(1, "Enter a unit name").max(64),
  shortName: z.string().trim().min(1, "Enter a short name").max(16),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;

export const labelFormSchema = z.object({
  id: z.string().trim().max(191),
  name: z.string().trim().min(1, "Enter a label name").max(64),
  slug,
  kind: z.enum(["HOT", "NEW", "SALE"]),
});

export type LabelFormValues = z.infer<typeof labelFormSchema>;

export const attributeFormSchema = z.object({
  id: z.string().trim().max(191),
  name: z.string().trim().min(1, "Enter an attribute name").max(64),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a slug")
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  style: z.enum(["BUTTON", "SWATCH"]),
});

export type AttributeFormValues = z.infer<typeof attributeFormSchema>;

export const attributeValueSchema = z.object({
  id: z.string().trim().max(191),
  attributeId: z.string().trim().min(1),
  label: z.string().trim().min(1, "Enter a value").max(64),
  swatch: z.string().trim().max(16),
  sortOrder: whole,
});

export type AttributeValueFormValues = z.infer<typeof attributeValueSchema>;

export const tagRenameSchema = z.object({
  from: z.string().trim().min(1, "Choose a tag").max(40),
  to: z.string().trim().min(1, "Enter the new tag").max(40),
});

export const reviewModerationSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const questionAnswerSchema = z.object({
  id: z.string().trim().min(1),
  answer: z.string().trim().min(1, "Enter an answer").max(5000),
});

export const quickEditSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1, "Enter a product name").max(191),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
  price: money,
  stock: whole,
});

export const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publish"),
    ids: z.array(z.string().min(1)).min(1, "Select at least one product").max(100),
  }),
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().min(1)).min(1, "Select at least one product").max(100),
  }),
  z.object({
    action: z.literal("price"),
    ids: z.array(z.string().min(1)).min(1, "Select at least one product").max(100),
    mode: z.enum(["set", "percent", "amount"]),
    value: z.number().finite(),
  }),
  z.object({
    action: z.literal("category"),
    ids: z.array(z.string().min(1)).min(1, "Select at least one product").max(100),
    categoryId: z.string().min(1, "Choose a category"),
    mode: z.enum(["add", "replace"]),
  }),
]);

export const importCsvSchema = z.object({
  csv: z.string().trim().min(1, "Choose a CSV file").max(500_000),
});
