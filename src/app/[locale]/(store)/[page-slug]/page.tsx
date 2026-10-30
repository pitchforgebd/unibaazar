import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import {
  ContactForm,
  FaqEmptyState,
  SizeGuide,
} from "@/components/store/content/CmsBlocks";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/db";
import { sanitizeRichText } from "@/lib/security/sanitizeHtml";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/schema";
import { publishedFaqs, seoFor } from "@/server/admin/content";

const extras = ["contact-us", "faq", "size-guide"] as const;

type CmsPageProps = {
  params: Promise<{ "page-slug": string }>;
};

// Prerendered otherwise never refreshes after build — editorial content
// changes rarely, so a longer window than product/category pages is fine.
export const revalidate = 300;

// Build-time DB access is unavailable by design on the release pipeline
// (ARCHITECTURE.md §12: "no real DB connection is needed at build time" —
// ci.yml's build-artifact job points DATABASE_URL at a syntactically
// valid but unreachable address on purpose, see ADR 0031). Falling back
// to [] here, rather than letting the query throw and crash the build,
// means no pages are pre-rendered at build time — but `dynamicParams`
// defaults to true, so every slug still renders (and then ISR-caches per
// `revalidate` above) on its own first real request instead.
export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    const slugs = new Set([...pages.map((page) => page.slug), ...extras]);
    return [...slugs].map((slug) => ({ "page-slug": slug }));
  } catch (error) {
    // Return [] rather than `extras` here even though their membership is
    // hardcoded: the page body and generateMetadata below still call
    // prisma.page.findFirst() unconditionally for every slug, extras
    // included (to check for CMS-overridden content), so pre-rendering
    // any slug — not just the DB-backed ones — would hit the same
    // unreachable-DB crash during the export step right after this.
    console.warn(
      "generateStaticParams for [page-slug]: DB unreachable at build time, falling back to on-demand rendering for every page",
      error,
    );
    return [];
  }
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { "page-slug": slug } = await params;
  const stored = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  const seo = stored ? await seoFor("PAGE", stored.id) : null;
  const cms = await getTranslations("cms");
  const faq = await getTranslations("faq");
  const fallback =
    slug === "contact-us"
      ? cms("contactUs.title")
      : slug === "faq"
        ? faq("title")
        : slug === "size-guide"
          ? cms("sizeGuide.title")
          : (stored?.title ?? "Page");
  return buildMetadata({
    title: seo?.metaTitle || fallback,
    description: seo?.metaDescription,
    path: `/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex,
    focusKeyword: seo?.focusKeyword,
  });
}

export default async function CmsRoute({ params }: CmsPageProps) {
  const { "page-slug": slug } = await params;
  const cms = await getTranslations("cms");
  const faq = await getTranslations("faq");
  const stored = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  const faqs = slug === "faq" ? await publishedFaqs() : [];
  const page = stored
    ? {
        title: stored.title,
        paragraphs: stored.body.includes("<")
          ? []
          : stored.body.split(/\n\n+/).filter(Boolean),
        html: stored.body.includes("<") ? sanitizeRichText(stored.body) : "",
      }
    : null;
  const title =
    slug === "contact-us"
      ? cms("contactUs.title")
      : slug === "faq"
        ? faq("title")
        : slug === "size-guide"
          ? cms("sizeGuide.title")
          : page?.title;

  if (!title) {
    notFound();
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ href: "/", label: "Home" }, { label: title }])} />
      {slug === "faq" && faqs.length > 0 ? <JsonLd data={faqJsonLd(faqs)} /> : null}
      <PageTitle
        title={title}
        crumbs={[{ href: "/", label: "Home" }, { label: title }]}
      />
      <Container className="max-w-3xl py-6">
        {slug === "contact-us" ? (
          <>
            <p className="mb-4 text-sm text-muted">
              {cms("contactUs.intro", {
                phone: siteConfig.contact.phoneDisplay,
                email: siteConfig.contact.email,
              })}
            </p>
            <ContactForm />
          </>
        ) : null}
        {slug === "faq" && faqs.length === 0 ? <FaqEmptyState /> : null}
        {slug === "faq" && faqs.length > 0 ? (
          <div className="mb-4 space-y-3">
            {faqs.map((item) => (
              <article key={item.id} className="rounded-lg bg-card p-4 shadow-soft">
                <h2 className="font-semibold text-ink">{item.question}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        ) : null}
        {slug === "size-guide" ? <SizeGuide /> : null}
        {page?.html ? (
          <div
            className="space-y-4 rounded-lg bg-card p-5 text-sm leading-7 shadow-soft sm:p-8"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        ) : page ? (
          <div className="space-y-4 rounded-lg bg-card p-5 shadow-soft sm:p-8">
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </Container>
    </>
  );
}
