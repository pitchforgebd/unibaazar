import { z } from "zod";
import { seoFieldSchema } from "@/lib/validation/admin-seo";

export const idSchema = z.object({
  id: z.string().trim().min(1),
});

const slug = z
  .string()
  .trim()
  .min(1, "Enter a slug")
  .max(191)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens");

export const pageSchema = z
  .object({
    slug,
    title: z.string().trim().min(1, "Enter a title").max(191),
    body: z.string().trim().min(1, "Enter the page text").max(20000),
    status: z.enum(["DRAFT", "PUBLISHED"]),
  })
  .merge(seoFieldSchema);

export const blogCategorySchema = z.object({
  slug,
  name: z.string().trim().min(1, "Enter a category name").max(191),
});

export const postSchema = z
  .object({
    slug,
    title: z.string().trim().min(1, "Enter a title").max(191),
    excerpt: z.string().trim().min(1, "Enter an excerpt").max(500),
    content: z.string().trim().min(1, "Enter the post").max(20000),
    authorName: z.string().trim().min(1, "Enter an author").max(191),
    categorySlug: z.string().trim().max(191),
    status: z.enum(["DRAFT", "PUBLISHED"]),
  })
  .merge(seoFieldSchema);

export const menuItemSchema = z.object({
  location: z.enum(["header", "footer", "mobile", "footer-service"]),
  label: z.string().trim().min(1, "Enter a label").max(191),
  href: z.string().trim().min(1, "Enter a link").max(500),
});

export const faqSchema = z.object({
  id: z.string().trim().optional().default(""),
  question: z.string().trim().min(1, "Enter a question").max(191),
  answer: z.string().trim().min(1, "Enter an answer").max(2000),
});

export const testimonialSchema = z
  .object({
    id: z.string().trim().optional().default(""),
    name: z.string().trim().min(1, "Enter a name").max(191),
    quote: z.string().trim().max(1000).optional().default(""),
    rating: z
      .string()
      .trim()
      .regex(/^[1-5]$/, "Choose a rating from 1 to 5"),
    imageUrl: z.string().trim().max(500).optional().default(""),
  })
  .refine((value) => value.quote || value.imageUrl, {
    message: "Enter a quote or upload a screenshot",
    path: ["quote"],
  });

export const homeVideoSchema = z.object({
  id: z.string().trim().optional().default(""),
  title: z.string().trim().min(1, "Enter a title").max(191),
  youtubeUrl: z.string().trim().min(1, "Enter a YouTube link").max(500),
});

export const homeSchema = z.object({
  sections: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(32),
        title: z.string().trim().min(1).max(191),
        enabled: z.boolean(),
        target: z.string().trim().max(191),
      }),
    )
    .min(1)
    .max(20),
});
