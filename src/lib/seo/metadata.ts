import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/urls";

export type PublicSeo = {
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  ogImage: string;
  focusKeyword: string;
  noIndex: boolean;
};

export function buildMetadata(input: {
  title: string;
  description?: string;
  path: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  focusKeyword?: string;
  type?: "website" | "article";
}): Metadata {
  const title = input.title;
  const description = input.description || undefined;
  const canonical = absoluteUrl(input.canonical || input.path);
  const image = input.ogImage
    ? input.ogImage.startsWith("http")
      ? input.ogImage
      : absoluteUrl(input.ogImage)
    : undefined;
  return {
    title,
    description,
    keywords: input.focusKeyword ? [input.focusKeyword] : undefined,
    // No hreflang alternates: locale is a cookie-based preference
    // (src/i18n/request.ts), not a separate URL per language, so there is
    // no distinct BN/EN page to point hreflang at — emitting one here would
    // just be three tags pointing at the same URL, which is misleading.
    alternates: {
      canonical,
    },
    robots: input.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: input.type ?? "website",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
