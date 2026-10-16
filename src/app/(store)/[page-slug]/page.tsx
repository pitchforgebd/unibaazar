import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ContactForm, FaqList, SizeGuide } from "@/components/store/content/CmsBlocks";
import { cmsPages, getCmsPage } from "@/lib/catalog/queries";
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

export function generateStaticParams() {
  return [...cmsPages.map((page) => page.slug), ...extras].map((slug) => ({
    "page-slug": slug,
  }));
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { "page-slug": slug } = await params;
  const stored = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  const seo = stored ? await seoFor("PAGE", stored.id) : null;
  const fallback =
    slug === "contact-us"
      ? "Contact us"
      : slug === "faq"
        ? "FAQs"
        : slug === "size-guide"
          ? "Size guide"
          : stored?.title || getCmsPage(slug)?.title || "Page";
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
    : getCmsPage(slug)
      ? {
          title: getCmsPage(slug)?.title ?? "",
          paragraphs: getCmsPage(slug)?.paragraphs ?? [],
          html: "",
        }
      : null;
  const title =
    slug === "contact-us"
      ? "Contact us"
      : slug === "faq"
        ? "FAQs"
        : slug === "size-guide"
          ? "Size guide"
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
              Call 01700-000000 or email hello@unibaazar.com. You can also send a message
              here.
            </p>
            <ContactForm />
          </>
        ) : null}
        {slug === "faq" && faqs.length === 0 ? <FaqList /> : null}
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
