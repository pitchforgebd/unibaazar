import { prisma } from "@/lib/db";
import { ApiError } from "@/server/http";

export async function publicPage(slug: string) {
  const page = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!page) {
    throw new ApiError(404, "Page not found");
  }
  return {
    slug: page.slug,
    title: page.title,
    paragraphs: page.body.split(/\n\n+/).filter(Boolean),
  };
}

export async function publicPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  return posts.map(presentPost);
}

export async function publicPost(slug: string) {
  const post = await prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!post) {
    throw new ApiError(404, "Post not found");
  }
  return presentPost(post);
}

function presentPost(post: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  imageHue: number | null;
  publishedAt: Date | null;
}) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    author: post.authorName,
    date: (post.publishedAt ?? new Date()).toISOString().slice(0, 10),
    hue: post.imageHue ?? 24,
    content: post.content.split(/\n\n+/).filter(Boolean),
  };
}

export async function publicBanners() {
  const now = new Date();
  const open = {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
  const [slides, banners] = await Promise.all([
    prisma.slider.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findMany({ where: open, orderBy: { sortOrder: "asc" } }),
  ]);
  return { slides, banners };
}

export async function publicMenu(location: string) {
  const menu = await prisma.menu.findFirst({
    where: { location, isActive: true },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!menu) {
    throw new ApiError(404, "Menu not found");
  }
  return {
    location: menu.location,
    items: menu.items.map((item) => ({ label: item.label, href: item.href })),
  };
}

export async function publicSettings() {
  const rows = await prisma.setting.findMany({
    where: { isSecret: false },
    orderBy: { key: "asc" },
  });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
