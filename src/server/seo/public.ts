import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { PublicSeo } from "@/lib/seo/metadata";
import { siteOrigin } from "@/server/tracking/config";

const emptySeo: PublicSeo = {
  metaTitle: "",
  metaDescription: "",
  canonical: "",
  ogImage: "",
  focusKeyword: "",
  noIndex: false,
};

export function defaultRobots(origin = siteOrigin()): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api",
    "Disallow: /account",
    "Disallow: /checkout",
    "Disallow: /search",
    "",
    // /sitemap.xml is now an index (Phase 11) covering every per-type
    // sitemap, image-sitemap.xml included — one line is enough, and
    // search engines expect to be pointed at the top index, not every
    // leaf.
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function loadRobots(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: "seo.robots" } });
  return typeof row?.value === "string" && row.value.trim() ? row.value : defaultRobots();
}

export async function findSeo(
  entityType: "PRODUCT" | "CATEGORY" | "BRAND" | "PAGE" | "BLOG_POST" | "BLOG_CATEGORY",
  entityId: string,
): Promise<PublicSeo> {
  const row = await prisma.seoMeta.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  if (!row) {
    return emptySeo;
  }
  return {
    metaTitle: row.metaTitle ?? "",
    metaDescription: row.metaDescription ?? "",
    canonical: row.canonical ?? "",
    ogImage: row.ogImage ?? "",
    focusKeyword: row.focusKeyword ?? "",
    noIndex: row.noIndex,
  };
}

export async function findActiveRedirect(
  path: string,
): Promise<{ toPath: string; statusCode: number } | null> {
  const row = await prisma.redirect.findUnique({ where: { fromPath: path } });
  if (!row?.isActive || (row.statusCode !== 301 && row.statusCode !== 302)) {
    return null;
  }
  if (row.toPath === path) {
    return null;
  }
  return { toPath: row.toPath, statusCode: row.statusCode };
}

export async function noteNotFound(path: string): Promise<void> {
  try {
    await prisma.notFoundHit.upsert({
      where: { path },
      update: { count: { increment: 1 }, lastSeen: new Date() },
      create: { path, count: 1 },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    await prisma.notFoundHit.update({
      where: { path },
      data: { count: { increment: 1 }, lastSeen: new Date() },
    });
  }
}
