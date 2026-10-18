import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { blogPosts, getBlogPost } from "@/lib/catalog/queries";
import { prisma } from "@/lib/db";
import { sanitizeRichText } from "@/lib/security/sanitizeHtml";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/schema";
import { seoFor } from "@/server/admin/content";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

// Prerendered otherwise never refreshes after build — editorial content
// changes rarely, so a longer window than product/category pages is fine.
export const revalidate = 300;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const stored = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  const seo = stored ? await seoFor("BLOG_POST", stored.id) : null;
  const post = getBlogPost(slug);
  return buildMetadata({
    title: seo?.metaTitle || stored?.title || post?.title || "Blog",
    description: seo?.metaDescription || stored?.excerpt || post?.excerpt,
    path: `/blog/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex,
    focusKeyword: seo?.focusKeyword,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const t = await getTranslations("blog");
  const stored = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  const fallback = getBlogPost(slug);
  const post = stored
    ? {
        title: stored.title,
        date: (stored.publishedAt ?? stored.createdAt).toISOString().slice(0, 10),
        author: stored.authorName,
        html: stored.content.includes("<") ? sanitizeRichText(stored.content) : "",
        paragraphs: stored.content.includes("<")
          ? []
          : stored.content.split(/\n\n+/).filter(Boolean),
      }
    : fallback
      ? {
          title: fallback.title,
          date: fallback.date,
          author: fallback.author,
          html: "",
          paragraphs: fallback.content,
        }
      : null;
  if (!post) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: stored?.excerpt || fallback?.excerpt || post.title,
          path: `/blog/${slug}`,
          date: post.date,
          author: post.author,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { href: "/", label: "Home" },
          { href: "/blog", label: t("pageTitle") },
          { label: post.title },
        ])}
      />
      <PageTitle
        title={post.title}
        subtitle={`${post.date} · ${post.author}`}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/blog", label: t("pageTitle") },
          { label: post.title },
        ]}
      />
      <Container className="max-w-3xl py-6">
        {post.html ? (
          <div
            className="rounded-lg bg-card p-5 text-sm leading-7 shadow-soft sm:p-8"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        ) : (
          <div className="space-y-4 rounded-lg bg-card p-5 shadow-soft sm:p-8">
            {post.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7">
                {paragraph}
              </p>
            ))}
          </div>
        )}
        <Link
          href="/blog"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {t("backToList")}
        </Link>
      </Container>
    </>
  );
}
