import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteOrigin } from "@/server/tracking/config";

// Queries the DB, so this can't be prerendered at build time (same reason
// the product/category/brand pages don't eagerly list their slugs either) —
// generated fresh per request instead, same as every other feed route.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [products, categories, posts, pages, hidden] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    prisma.seoMeta.findMany({
      where: { noIndex: true },
      select: { entityType: true, entityId: true },
    }),
  ]);
  const hiddenIds = new Set(hidden.map((row) => `${row.entityType}:${row.entityId}`));
  const visible = <T extends { id: string }>(entityType: string, rows: T[]) =>
    rows.filter((row) => !hiddenIds.has(`${entityType}:${row.id}`));
  const staticPaths = ["", "/shop", "/blog", "/contact-us", "/faq"];
  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path || "/"}` })),
    ...visible("PRODUCT", products).map((row) => ({
      url: `${origin}/product/${row.slug}`,
      lastModified: row.updatedAt,
    })),
    ...visible("CATEGORY", categories).map((row) => ({
      url: `${origin}/category/${row.slug}`,
      lastModified: row.updatedAt,
    })),
    ...visible("BLOG_POST", posts).map((row) => ({
      url: `${origin}/blog/${row.slug}`,
      lastModified: row.updatedAt,
    })),
    ...visible("PAGE", pages).map((row) => ({
      url: `${origin}/${row.slug}`,
      lastModified: row.updatedAt,
    })),
  ];
}
