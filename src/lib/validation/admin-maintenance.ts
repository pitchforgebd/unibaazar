import { z } from "zod";

export const maintenanceJobIdSchema = z.object({
  jobId: z.string().trim().min(1).max(64),
});

export const bootstrapAdminInputSchema = z.object({
  phone: z.string().trim().min(6, "Enter a phone number").max(20).default("01700000000"),
  password: z.string().min(8, "Use a password of at least 8 characters"),
  name: z.string().trim().min(1, "Enter a name").max(191).default("Admin"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(191)
    .default("admin@unibaazar.com"),
});

export const mediaBackfillInputSchema = z.object({
  batchSize: z.coerce.number().int().positive().max(500).optional(),
});
