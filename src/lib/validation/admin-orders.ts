import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount");

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SENT_TO_COURIER",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "FAILED",
  "ON_HOLD",
  "PARTIAL_DELIVERED",
  "REFUNDED",
] as const;

export const statusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(orderStatuses),
  note: z.string().trim().max(1000),
});

export const notesSchema = z.object({
  orderId: z.string().trim().min(1),
  customerNote: z.string().trim().max(2000),
  internalNote: z.string().trim().max(2000),
});

export const itemsSchema = z
  .object({
    orderId: z.string().trim().min(1),
    discount: money,
    deliveryCharge: money,
    items: z.array(
      z.object({
        id: z.string().trim().min(1),
        qty: z
          .string()
          .trim()
          .regex(/^[1-9]\d*$/, "Quantity must be at least 1"),
        unitPrice: money,
      }),
    ),
    addSku: z.string().trim().max(64),
    addQty: z.string().trim(),
  })
  .refine((value) => value.items.length > 0 || value.addSku.length > 0, {
    message: "An order needs at least one item",
    path: ["items"],
  });

export const paymentSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
});

export const manualOrderSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer name").max(191),
  phone: z.string().trim().min(1, "Enter a phone number"),
  email: z.string().trim().max(191),
  address: z.string().trim().min(1, "Enter an address").max(500),
  area: z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"]),
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "ROCKET", "CARD"]),
  customerNote: z.string().trim().max(1000),
  source: z.enum(["phone", "facebook"]),
  lines: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        qty: z
          .string()
          .trim()
          .regex(/^[1-9]\d*$/, "Quantity must be at least 1"),
      }),
    )
    .min(1, "Add at least one product")
    .max(30),
});

export const returnSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["APPROVED", "REJECTED", "REFUNDED"]),
  refundAmount: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
      "Enter a valid amount",
    ),
});

export const templateSchema = z.object({
  sms: z.string().trim().min(1, "Enter an SMS template").max(500),
  emailSubject: z.string().trim().min(1, "Enter an email subject").max(191),
  emailBody: z.string().trim().min(1, "Enter an email template").max(5000),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one order").max(50),
  status: z.enum(orderStatuses),
});

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one order").max(50),
});
