import { z } from "zod";

const optionSchema = z.object({
  label: z.string().trim().min(1, "Enter an option label"),
  swatch: z.string().trim().min(1).optional(),
  skuCode: z.string().trim().min(1).max(12).optional(),
});

const axisSchema = z.object({
  name: z.string().trim().min(1, "Enter an attribute name"),
  values: z.array(optionSchema).min(1, "Add at least one option"),
});

export const generateVariantsSchema = z
  .object({
    skuPrefix: z.string().trim().min(1, "Enter a SKU prefix").max(24),
    basePrice: z.number().nonnegative("Price cannot be negative"),
    salePrice: z.number().nonnegative("Sale price cannot be negative").nullable(),
    costPrice: z.number().nonnegative("Cost cannot be negative").nullable(),
    stock: z
      .number()
      .int("Stock must be a whole number")
      .nonnegative("Stock cannot be negative"),
    imageHue: z.number().int().min(0).max(360).nullable(),
    attributes: z.array(axisSchema).min(1, "Choose at least one attribute"),
  })
  .superRefine((value, ctx) => {
    if (value.salePrice !== null && value.salePrice > value.basePrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sale price cannot be higher than the price",
        path: ["salePrice"],
      });
    }

    const names = new Set<string>();
    let count = 1;
    value.attributes.forEach((attribute, index) => {
      if (names.has(attribute.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${attribute.name} is listed twice`,
          path: ["attributes", index, "name"],
        });
      }
      names.add(attribute.name);

      const labels = new Set<string>();
      attribute.values.forEach((option, valueIndex) => {
        if (labels.has(option.label)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${option.label} is listed twice for ${attribute.name}`,
            path: ["attributes", index, "values", valueIndex, "label"],
          });
        }
        labels.add(option.label);
      });
      count *= attribute.values.length;
    });

    if (count > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Too many combinations. Use 200 or fewer.",
        path: ["attributes"],
      });
    }
  });

export const variantBulkEditSchema = z
  .object({
    variantIds: z.array(z.string().trim().min(1)).min(1, "Select at least one variant"),
    price: z.number().nonnegative("Price cannot be negative").optional(),
    salePrice: z
      .number()
      .nonnegative("Sale price cannot be negative")
      .nullable()
      .optional(),
    costPrice: z.number().nonnegative("Cost cannot be negative").nullable().optional(),
    stock: z
      .number()
      .int("Stock must be a whole number")
      .nonnegative("Stock cannot be negative")
      .optional(),
  })
  .refine(
    (value) =>
      value.price !== undefined ||
      value.salePrice !== undefined ||
      value.costPrice !== undefined ||
      value.stock !== undefined,
    { message: "Enter a price or stock to update" },
  );

export type GenerateVariantsInput = z.infer<typeof generateVariantsSchema>;
export type VariantBulkEditInput = z.infer<typeof variantBulkEditSchema>;
