import { variantPrice } from "@/lib/catalog/pricing";
import { absoluteUrl } from "@/lib/seo/urls";
import { youtubeEmbedId } from "@/lib/seo/youtube";
import { visibleText } from "@/lib/text/visibleText";
import { siteConfig } from "@/config/site";
import type { Product, ProductVariant } from "@/types/catalog";

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phoneDisplay,
    address: siteConfig.contact.address,
  };
}

export function breadcrumbJsonLd(
  crumbs: { href?: string; label: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };
}

/** Shared by productJsonLd() and productGroupJsonLd() — Dhaka and the
 * rest of Bangladesh are the only two rates this storefront's checkout
 * actually charges (src/server/settings/store.ts's CheckoutSettings),
 * so those are the only two OfferShippingDetails entries there's a
 * real number to back. */
function shippingDetails(rates?: {
  inside: number;
  outside: number;
}): Record<string, unknown>[] | undefined {
  if (!rates) {
    return undefined;
  }
  const entry = (amount: number, region?: string) => ({
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: amount, currency: "BDT" },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "BD",
      ...(region ? { addressRegion: region } : {}),
    },
  });
  return [entry(rates.inside, "Dhaka"), entry(rates.outside)];
}

function reviewJsonLd(
  reviews: {
    author: string;
    rating: number;
    comment: string;
    createdAt: string;
  }[],
): Record<string, unknown>[] | undefined {
  if (reviews.length === 0) {
    return undefined;
  }
  return reviews.map((review) => ({
    "@type": "Review",
    author: { "@type": "Person", name: review.author },
    reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
    reviewBody: review.comment,
    datePublished: review.createdAt,
  }));
}

export function productJsonLd(
  product: Product,
  options?: {
    reviews?: { author: string; rating: number; comment: string; createdAt: string }[];
    deliveryRates?: { inside: number; outside: number };
  },
): Record<string, unknown> {
  const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
  const shipping = shippingDetails(options?.deliveryRates);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: visibleText(product.shortDescription),
    sku: variant.sku,
    ...(product.images[0] ? { image: absoluteUrl(product.images[0].url) } : {}),
    brand: {
      "@type": "Brand",
      name: product.brandName,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: variantPrice(variant),
      availability:
        variant.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/product/${product.slug}`),
      ...(shipping ? { shippingDetails: shipping } : {}),
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    ...(options?.reviews && reviewJsonLd(options.reviews)
      ? { review: reviewJsonLd(options.reviews) }
      : {}),
  };
}

/**
 * Used instead of productJsonLd() when a product actually has more
 * than one variant (size/color, etc.) — a flat Product with just the
 * default variant's offer understates what's really for sale. Each
 * variant's `attributes` (Size/Color/...) become its own name
 * suffix, matching how ProductPurchase.tsx already labels a variant
 * in the UI.
 */
export function productGroupJsonLd(
  product: Product,
  options?: { deliveryRates?: { inside: number; outside: number } },
): Record<string, unknown> {
  const variantName = (variant: ProductVariant) => {
    const attrs = Object.values(variant.attributes).filter(Boolean);
    return attrs.length > 0 ? `${product.name} (${attrs.join(", ")})` : product.name;
  };
  const shipping = shippingDetails(options?.deliveryRates);
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    description: visibleText(product.shortDescription),
    productGroupID: product.id,
    variesBy: product.attributes.map((attribute) => attribute.name),
    ...(product.images[0] ? { image: absoluteUrl(product.images[0].url) } : {}),
    hasVariant: product.variants.map((variant) => ({
      "@type": "Product",
      name: variantName(variant),
      sku: variant.sku,
      ...(variant.image ? { image: absoluteUrl(variant.image.url) } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: "BDT",
        price: variantPrice(variant),
        availability:
          variant.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: absoluteUrl(`/product/${product.slug}`),
        ...(shipping ? { shippingDetails: shipping } : {}),
      },
    })),
  };
}

export function itemListJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function videoObjectJsonLd(input: {
  name: string;
  description: string;
  youtubeUrl: string;
  uploadDate?: string;
}): Record<string, unknown> | null {
  const id = youtubeEmbedId(input.youtubeUrl);
  if (!id) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.name,
    description: input.description,
    thumbnailUrl: [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${id}`,
    ...(input.uploadDate ? { uploadDate: input.uploadDate } : {}),
  };
}

export function faqJsonLd(
  items: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  date: string;
  author: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.date,
    author: { "@type": "Person", name: input.author },
    mainEntityOfPage: absoluteUrl(input.path),
  };
}
