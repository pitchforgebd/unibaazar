import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { blogPosts } from "@/lib/catalog/queries";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Blog" };

// If Next can statically render this list, this caps staleness at 5
// minutes — editorial content changes rarely, so a longer window than
// product/category pages is fine (see the build output for whether this
// page actually renders statically or dynamically).
export const revalidate = 300;

export default async function BlogPage() {
  const stored = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  const posts =
    stored.length > 0
      ? stored.map((post) => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          author: post.authorName,
          date: (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
          hue: post.imageHue ?? 24,
        }))
      : blogPosts;

  return (
    <>
      <PageTitle
        title="Blog"
        crumbs={[{ href: "/", label: "Home" }, { label: "Blog" }]}
      />
      <Container className="grid gap-4 py-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="overflow-hidden rounded-lg bg-card shadow-soft"
          >
            <ProductMedia hue={post.hue} name={post.title} className="h-36" />
            <div className="p-4">
              <p className="text-xs text-muted">
                {post.date} · {post.author}
              </p>
              <h2 className="mt-1 font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </Container>
    </>
  );
}
