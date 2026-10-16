import { z } from "zod";

const pathValue = z
  .string()
  .trim()
  .min(1, "Enter a path")
  .max(500)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("?"),
    "Use a site path that starts with /",
  );

export const seoFieldSchema = z.object({
  metaTitle: z.string().trim().max(191),
  metaDescription: z.string().trim().max(2000),
  canonical: z.string().trim().max(500),
  ogImage: z.string().trim().max(500),
  focusKeyword: z.string().trim().max(80),
  noIndex: z.boolean(),
});

export const robotsSchema = z.object({
  robots: z.string().trim().min(1, "Enter the robots.txt rules").max(8000),
});

export const redirectSchema = z
  .object({
    fromPath: pathValue,
    toPath: pathValue,
    statusCode: z.union([z.literal(301), z.literal(302)]),
  })
  .refine((value) => value.fromPath !== value.toPath, "Choose a different destination")
  .refine(
    (value) => !value.fromPath.startsWith("/admin") && !value.fromPath.startsWith("/api"),
    "Leave admin and API paths unchanged",
  );

export const redirectDeleteSchema = z.object({
  id: z.string().trim().min(1).max(191),
});
