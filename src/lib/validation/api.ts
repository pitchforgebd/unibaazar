import { z } from "zod";
import { checkoutSchema, phoneField } from "@/lib/validation/customer";

export const cartLineSchema = z.object({
  slug: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  qty: z.number().int().positive().max(99),
});

const reservationTokenField = z.string().trim().min(1).max(64).optional();

export const quoteBodySchema = z.object({
  lines: z.array(cartLineSchema).min(1, "Your cart is empty"),
  couponCode: z.string().trim().optional(),
  area: z.enum(["inside-dhaka", "outside-dhaka"]),
  reservationToken: reservationTokenField,
});

const utmField = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value.replace(/[<>]/g, ""))
  .optional();

export const placeOrderSchema = checkoutSchema.and(
  z.object({
    lines: z.array(cartLineSchema).min(1, "Your cart is empty"),
    couponCode: z.string().trim().optional(),
    reservationToken: reservationTokenField,
    utmSource: utmField,
    utmMedium: utmField,
    utmCampaign: utmField,
    utmTerm: utmField,
    utmContent: utmField,
  }),
);

export const trackBodySchema = z.object({
  orderId: z.string().trim().min(4),
  phone: phoneField,
});

export const cancelBodySchema = z.object({
  phone: phoneField,
});

export const returnBodySchema = z.object({
  phone: phoneField,
  reason: z.string().trim().min(8, "Tell us why you are returning this order"),
});

export const callbackBodySchema = z.object({
  orderNumber: z.string().trim().min(4),
  gatewayRef: z.string().trim().min(1),
  status: z.enum(["PAID", "FAILED"]),
});
