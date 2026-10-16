import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount");
const whole = z.string().trim();
const when = z.string().trim();

const optionalId = z.string().trim().optional().default("");

export const couponSchema = z.object({
  id: optionalId,
  code: z
    .string()
    .trim()
    .min(2, "Enter a coupon code")
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens"),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.string().trim(),
  minSubtotal: money,
  usageLimit: whole,
  perUserLimit: whole,
  startsAt: when,
  endsAt: when,
  categorySlug: z.string().trim().max(191),
  productSlug: z.string().trim().max(191),
  isActive: z.boolean(),
});

export const flashSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Enter a sale name").max(191),
  startsAt: z.string().trim().min(1, "Enter a start"),
  endsAt: z.string().trim().min(1, "Enter an end"),
  sku: z.string().trim().min(1, "Enter a SKU").max(64),
  salePrice: money,
  qtyLimit: whole,
  isActive: z.boolean(),
});

export const bannerSchema = z.object({
  id: optionalId,
  title: z.string().trim().min(1, "Enter a title").max(191),
  subtitle: z.string().trim().max(500),
  href: z.string().trim().min(1, "Enter a link").max(500),
  imageUrl: z.string().trim().max(500).optional().default(""),
  placement: z.enum(["home", "category", "popup", "exit"]),
  sortOrder: whole,
  isActive: z.boolean(),
});

export const sliderSchema = z.object({
  id: optionalId,
  title: z.string().trim().min(1, "Enter a title").max(191),
  subtitle: z.string().trim().max(500),
  href: z.string().trim().min(1, "Enter a link").max(500),
  imageUrl: z.string().trim().max(500).optional().default(""),
  sortOrder: whole,
  isActive: z.boolean(),
});

export const idSchema = z.object({
  id: z.string().trim().min(1),
});

export const subscriberSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(191),
  phone: z.string().trim().max(20),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Enter a campaign name").max(191),
  channel: z.enum(["SMS", "EMAIL"]),
  subject: z.string().trim().max(191),
  body: z.string().trim().min(1, "Enter the message").max(2000),
});

export const campaignIdSchema = z.object({
  id: z.string().trim().min(1),
});

export const relationSchema = z.object({
  id: optionalId,
  productSlug: z.string().trim().min(1, "Enter the product slug").max(191),
  relatedSlug: z.string().trim().min(1, "Enter the related slug").max(191),
  kind: z.enum(["UPSELL", "CROSS_SELL", "BUNDLE", "RELATED"]),
});

export const cartIdSchema = z.object({
  id: z.string().trim().min(1),
});
