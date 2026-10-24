import type { PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/server/security/audit";
import { findSeo } from "@/server/seo/public";

export const homeDefaults = [
  { key: "hero", title: "Hero" },
  { key: "categories", title: "Categories" },
  { key: "flash", title: "Flash sale" },
  { key: "offers", title: "Offers" },
  { key: "featured", title: "Featured" },
  { key: "recent", title: "Recent" },
  { key: "bestsellers", title: "Best sellers" },
  { key: "trust", title: "Trust" },
  { key: "testimonials", title: "Testimonials" },
  { key: "videos", title: "Videos" },
  { key: "instagram", title: "Instagram" },
  { key: "blog", title: "Blog" },
] as const;

export type HomeSectionRow = {
  key: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
  target: string;
};

async function saveSeo(
  entityType: "PAGE" | "BLOG_POST",
  entityId: string,
  input: {
    metaTitle: string;
    metaDescription: string;
    canonical: string;
    ogImage: string;
    focusKeyword: string;
    noIndex: boolean;
  },
): Promise<void> {
  await prisma.seoMeta.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    update: {
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
      canonical: input.canonical || null,
      ogImage: input.ogImage || null,
      focusKeyword: input.focusKeyword || null,
      noIndex: input.noIndex,
    },
    create: {
      entityType,
      entityId,
      metaTitle: input.metaTitle || null,
      metaDescription: input.metaDescription || null,
      canonical: input.canonical || null,
      ogImage: input.ogImage || null,
      focusKeyword: input.focusKeyword || null,
      noIndex: input.noIndex,
    },
  });
}

export async function listPages() {
  const rows = await prisma.page.findMany({ orderBy: { title: "asc" }, take: 50 });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
  }));
}

export async function savePage(
  actorId: string,
  input: {
    slug: string;
    title: string;
    body: string;
    status: PublishStatus;
    metaTitle: string;
    metaDescription: string;
    canonical: string;
    ogImage: string;
    focusKeyword: string;
    noIndex: boolean;
  },
): Promise<string> {
  const page = await prisma.page.upsert({
    where: { slug: input.slug },
    update: { title: input.title, body: input.body, status: input.status },
    create: {
      slug: input.slug,
      title: input.title,
      body: input.body,
      status: input.status,
    },
  });
  await saveSeo("PAGE", page.id, input);
  await recordAudit({
    actorId,
    action: "content.page",
    entityType: "Page",
    entityId: page.id,
  });
  return `${input.title} saved.`;
}

export async function listBlogCategories() {
  return prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
}

export async function saveBlogCategory(
  actorId: string,
  input: { slug: string; name: string },
): Promise<string> {
  const category = await prisma.blogCategory.upsert({
    where: { slug: input.slug },
    update: { name: input.name },
    create: { slug: input.slug, name: input.name },
  });
  await recordAudit({
    actorId,
    action: "content.blogCategory",
    entityType: "BlogCategory",
    entityId: category.id,
  });
  return `${input.name} saved.`;
}

export async function listPosts() {
  const rows = await prisma.blogPost.findMany({
    include: { category: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    authorName: row.authorName,
    category: row.category?.name ?? "",
    status: row.status,
  }));
}

export async function savePost(
  actorId: string,
  input: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    authorName: string;
    categorySlug: string;
    status: PublishStatus;
    metaTitle: string;
    metaDescription: string;
    canonical: string;
    ogImage: string;
    focusKeyword: string;
    noIndex: boolean;
  },
): Promise<string> {
  const category = input.categorySlug
    ? await prisma.blogCategory.findUnique({ where: { slug: input.categorySlug } })
    : null;
  if (input.categorySlug && !category) {
    throw new Error("Blog category was not found");
  }
  const post = await prisma.blogPost.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      authorName: input.authorName,
      categoryId: category?.id ?? null,
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    },
    create: {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      authorName: input.authorName,
      categoryId: category?.id,
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      imageHue: 24,
    },
  });
  await saveSeo("BLOG_POST", post.id, input);
  await recordAudit({
    actorId,
    action: "content.post",
    entityType: "BlogPost",
    entityId: post.id,
  });
  return `${input.title} saved.`;
}

export async function listMenus() {
  const menus = await prisma.menu.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { location: "asc" },
  });
  return menus.map((menu) => ({
    location: menu.location,
    name: menu.name,
    items: menu.items.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    })),
  }));
}

const menuNames: Record<string, string> = {
  header: "Header",
  footer: "Footer",
  mobile: "Mobile",
  "footer-service": "Footer service",
};

export async function saveMenuItem(
  actorId: string,
  input: { location: string; label: string; href: string },
): Promise<string> {
  const menu = await prisma.menu.upsert({
    where: { location: input.location },
    update: {},
    create: {
      location: input.location,
      name: menuNames[input.location] ?? input.location,
    },
  });
  const count = await prisma.menuItem.count({ where: { menuId: menu.id } });
  const item = await prisma.menuItem.create({
    data: { menuId: menu.id, label: input.label, href: input.href, sortOrder: count },
  });
  await recordAudit({
    actorId,
    action: "content.menu",
    entityType: "MenuItem",
    entityId: item.id,
  });
  return "Menu link saved.";
}

export async function listFaqs() {
  const rows = await prisma.faq.findMany({ orderBy: { sortOrder: "asc" }, take: 50 });
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    isActive: row.isActive,
  }));
}

export async function saveFaq(
  actorId: string,
  input: { id?: string; question: string; answer: string },
): Promise<string> {
  const faq = input.id
    ? await prisma.faq.update({
        where: { id: input.id },
        data: { question: input.question, answer: input.answer },
      })
    : await prisma.faq.create({
        data: {
          question: input.question,
          answer: input.answer,
          sortOrder: await prisma.faq.count(),
        },
      });
  await recordAudit({
    actorId,
    action: "content.faq",
    entityType: "Faq",
    entityId: faq.id,
  });
  return "FAQ saved.";
}

export async function deleteFaq(actorId: string, id: string): Promise<string> {
  await prisma.faq.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "content.faq.delete",
    entityType: "Faq",
    entityId: id,
  });
  return "FAQ removed.";
}

export async function listTestimonials() {
  const rows = await prisma.testimonial.findMany({
    orderBy: { sortOrder: "asc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quote: row.quote,
    rating: row.rating,
    imageUrl: row.imageUrl ?? "",
    isActive: row.isActive,
  }));
}

export async function saveTestimonial(
  actorId: string,
  input: { id?: string; name: string; quote: string; rating: string; imageUrl?: string },
): Promise<string> {
  const data = {
    name: input.name,
    quote: input.quote,
    rating: Number(input.rating),
    imageUrl: input.imageUrl || null,
  };
  const row = input.id
    ? await prisma.testimonial.update({ where: { id: input.id }, data })
    : await prisma.testimonial.create({
        data: { ...data, sortOrder: await prisma.testimonial.count() },
      });
  await recordAudit({
    actorId,
    action: "content.testimonial",
    entityType: "Testimonial",
    entityId: row.id,
  });
  return "Testimonial saved.";
}

export async function deleteTestimonial(actorId: string, id: string): Promise<string> {
  await prisma.testimonial.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "content.testimonial.delete",
    entityType: "Testimonial",
    entityId: id,
  });
  return "Testimonial removed.";
}

export async function listHomeVideos() {
  const rows = await prisma.homeVideo.findMany({
    orderBy: { sortOrder: "asc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtubeUrl,
    isActive: row.isActive,
  }));
}

export async function saveHomeVideo(
  actorId: string,
  input: { id?: string; title: string; youtubeUrl: string },
): Promise<string> {
  const data = { title: input.title, youtubeUrl: input.youtubeUrl };
  const row = input.id
    ? await prisma.homeVideo.update({ where: { id: input.id }, data })
    : await prisma.homeVideo.create({
        data: { ...data, sortOrder: await prisma.homeVideo.count() },
      });
  await recordAudit({
    actorId,
    action: "content.homeVideo",
    entityType: "HomeVideo",
    entityId: row.id,
  });
  return "Video saved.";
}

export async function deleteHomeVideo(actorId: string, id: string): Promise<string> {
  await prisma.homeVideo.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "content.homeVideo.delete",
    entityType: "HomeVideo",
    entityId: id,
  });
  return "Video removed.";
}

export async function publishedHomeVideos() {
  const rows = await prisma.homeVideo.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
    select: { id: true, title: true, youtubeUrl: true },
  });
  return rows;
}

/** The storefront `/videos` gallery (Phase 5) — every active video, not
 * just the homepage teaser's first 4. Same query shape, no `take`. */
export async function allPublishedHomeVideos() {
  const rows = await prisma.homeVideo.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, youtubeUrl: true, createdAt: true },
  });
  return rows;
}

export async function listHomeSections(): Promise<HomeSectionRow[]> {
  const rows = await prisma.homeSection.findMany({ orderBy: { sortOrder: "asc" } });
  if (rows.length === 0) {
    return homeDefaults.map((row, index) => ({
      key: row.key,
      title: row.title,
      enabled: row.key !== "instagram",
      sortOrder: index,
      target: "",
    }));
  }
  const mapped = rows.map((row) => ({
    key: row.key,
    title: row.title,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    target: row.target,
  }));
  const present = new Set(mapped.map((row) => row.key));
  const extras = homeDefaults
    .filter((row) => !present.has(row.key))
    .map((row, index) => ({
      key: row.key,
      title: row.title,
      enabled: row.key !== "instagram",
      sortOrder: mapped.length + index,
      target: "",
    }));
  return [...mapped, ...extras];
}

export async function saveHomeSections(
  actorId: string,
  sections: { key: string; title: string; enabled: boolean; target: string }[],
): Promise<string> {
  const known = new Set(homeDefaults.map((row) => row.key));
  for (const [index, section] of sections.entries()) {
    if (!known.has(section.key as (typeof homeDefaults)[number]["key"])) {
      throw new Error("Unknown homepage section");
    }
    await prisma.homeSection.upsert({
      where: { key: section.key },
      update: {
        title: section.title,
        enabled: section.enabled,
        sortOrder: index,
        target: section.target,
      },
      create: {
        key: section.key,
        title: section.title,
        enabled: section.enabled,
        sortOrder: index,
        target: section.target,
      },
    });
  }
  await recordAudit({ actorId, action: "content.home", entityType: "HomeSection" });
  return "Homepage saved.";
}

export async function publishedFaqs() {
  return prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });
}

export async function publishedTestimonials() {
  const rows = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, quote: true, rating: true, imageUrl: true },
  });
  return rows.map((row) => ({ ...row, imageUrl: row.imageUrl ?? "" }));
}

export async function seoFor(entityType: "PAGE" | "BLOG_POST", entityId: string) {
  return findSeo(entityType, entityId);
}
