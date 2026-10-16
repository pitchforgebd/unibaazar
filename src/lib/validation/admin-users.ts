import { z } from "zod";
import { phoneField } from "@/lib/validation/customer";
import { staffRoleSlugs } from "@/server/security/permissions";

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneField,
  email: z.union([z.literal(""), z.string().trim().email()]),
  password: z.string().min(6).max(72),
  roleSlug: z.enum(staffRoleSlugs),
});

export const updateStaffSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.union([z.literal(""), z.string().trim().email()]),
  roleSlug: z.enum(staffRoleSlugs),
  status: z.enum(["ACTIVE", "DISABLED"]),
  password: z.union([z.literal(""), z.string().min(6).max(72)]).optional(),
});

export const rolePermissionSchema = z.object({
  roleSlug: z.enum(staffRoleSlugs),
  permissionSlug: z.string().min(1),
  enabled: z.boolean(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1),
});

export const ipAllowlistSchema = z.object({
  value: z.string().max(4000),
});

export const totpCodeSchema = z.object({
  code: z.string().trim().min(6).max(12),
});
