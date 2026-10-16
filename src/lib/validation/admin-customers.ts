import { z } from "zod";
import { phoneField } from "@/lib/validation/customer";

export const customerProfileSchema = z.object({
  customerId: z.string().trim().min(1),
  notes: z.string().trim().max(2000),
  tags: z.string().trim().max(500),
});

export const blockSchema = z.object({
  customerId: z.string().trim().min(1),
  blocked: z.boolean(),
});

export const addressSchema = z.object({
  customerId: z.string().trim().min(1),
  name: z.string().trim().min(1, "Enter a name").max(191),
  phone: phoneField,
  line1: z.string().trim().min(1, "Enter an address").max(500),
  area: z.enum(["INSIDE_DHAKA", "OUTSIDE_DHAKA"]),
  city: z.string().trim().min(1, "Enter a city").max(191),
  label: z.enum(["HOME", "OFFICE", "OTHER"]),
  isDefault: z.boolean(),
});

export const addressIdSchema = z.object({
  customerId: z.string().trim().min(1),
  addressId: z.string().trim().min(1),
});
