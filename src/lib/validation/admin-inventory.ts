import { z } from "zod";

const qtyChange = z
  .string()
  .trim()
  .regex(/^-?[1-9]\d*$/, "Enter a quantity to add or remove");

export const adjustSchema = z.object({
  sku: z.string().trim().min(1, "Enter a SKU").max(64),
  change: qtyChange,
  reason: z.enum(["ADJUSTMENT", "PURCHASE", "RETURN", "SALE"]),
  note: z.string().trim().max(500),
  warehouseId: z.string().trim().max(64),
});

export const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter a warehouse code")
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens"),
  name: z.string().trim().min(1, "Enter a warehouse name").max(191),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier name").max(191),
  phone: z.string().trim().max(20),
  email: z.string().trim().max(191),
  address: z.string().trim().max(500),
});

export const purchaseSchema = z.object({
  supplierId: z.string().trim().min(1, "Choose a supplier"),
  notes: z.string().trim().max(1000),
  lines: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        qty: z
          .string()
          .trim()
          .regex(/^[1-9]\d*$/, "Quantity must be at least 1"),
        cost: z
          .string()
          .trim()
          .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid cost"),
      }),
    )
    .min(1, "Add at least one product")
    .max(30),
});

export const variantIdsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Select at least one variant").max(50),
});

export const purchaseIdSchema = z.object({
  id: z.string().trim().min(1),
});
