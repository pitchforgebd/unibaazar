import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  itemListJsonLd,
  organizationJsonLd,
  productGroupJsonLd,
  productJsonLd,
  videoObjectJsonLd,
  websiteJsonLd,
} from "./schema";
import type { Product } from "@/types/catalog";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_1",
    slug: "cotton-crew-tshirt",
    name: "Cotton Crew T-Shirt",
    brandSlug: "unibaazar",
    brandName: "UniBaazar",
    categorySlug: "t-shirts",
    rating: 4.5,
    reviewCount: 2,
    imageHue: 0,
    images: [{ url: "/uploads/tee.jpg", alt: "" }],
    shortDescription: "A mid-weight cotton tee.",
    description: "Long description.",
    warranty: "",
    returns: "",
    featured: false,
    bestSeller: false,
    isNew: false,
    flashSale: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    attributes: [{ name: "Size", style: "button", values: [{ label: "S" }] }],
    variants: [
      {
        id: "v1",
        sku: "tee-s-black",
        price: 890,
        salePrice: 690,
        stock: 10,
        imageHue: 0,
        image: null,
        attributes: { Size: "S", Color: "Black" },
      },
    ],
    ...overrides,
  };
}

describe("websiteJsonLd / organizationJsonLd", () => {
  it("are valid @type WebSite / Organization with a context", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
    });
    expect(organizationJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
    });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers each crumb by position, starting at 1", () => {
    const data = breadcrumbJsonLd([{ href: "/", label: "Home" }, { label: "Shop" }]) as {
      itemListElement: { position: number; name: string }[];
    };
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(data.itemListElement[1].name).toBe("Shop");
  });
});

describe("faqJsonLd / articleJsonLd", () => {
  it("builds a FAQPage with one Question per item", () => {
    const data = faqJsonLd([{ question: "Q1", answer: "A1" }]) as {
      mainEntity: unknown[];
    };
    expect(data.mainEntity).toHaveLength(1);
  });

  it("builds an Article with the given headline", () => {
    const data = articleJsonLd({
      title: "My Post",
      description: "desc",
      path: "/blog/my-post",
      date: "2026-01-01",
      author: "Admin",
    });
    expect(data).toMatchObject({ "@type": "Article", headline: "My Post" });
  });
});

describe("productJsonLd", () => {
  it("includes the default variant's offer and the product's own image", () => {
    const data = productJsonLd(makeProduct()) as {
      offers: { price: number };
      image: string;
    };
    expect(data.offers.price).toBe(690);
    expect(data.image).toContain("/uploads/tee.jpg");
  });

  it("omits aggregateRating when there are no reviews yet", () => {
    const data = productJsonLd(makeProduct({ reviewCount: 0 }));
    expect(data).not.toHaveProperty("aggregateRating");
  });

  it("includes Review objects and shippingDetails when given", () => {
    const data = productJsonLd(makeProduct(), {
      reviews: [
        { author: "Rina", rating: 5, comment: "Great!", createdAt: "2026-01-02" },
      ],
      deliveryRates: { inside: 70, outside: 130 },
    }) as {
      review: { author: { name: string } }[];
      offers: { shippingDetails: { shippingRate: { value: number } }[] };
    };
    expect(data.review[0].author.name).toBe("Rina");
    expect(data.offers.shippingDetails.map((row) => row.shippingRate.value)).toEqual([
      70, 130,
    ]);
  });

  it("omits shippingDetails when no delivery rates are given", () => {
    const data = productJsonLd(makeProduct()) as { offers: Record<string, unknown> };
    expect(data.offers).not.toHaveProperty("shippingDetails");
  });
});

describe("productGroupJsonLd", () => {
  it("lists every variant with its own offer, named by its attributes", () => {
    const product = makeProduct({
      variants: [
        {
          id: "v1",
          sku: "tee-s-black",
          price: 890,
          salePrice: 690,
          stock: 10,
          imageHue: 0,
          image: null,
          attributes: { Size: "S", Color: "Black" },
        },
        {
          id: "v2",
          sku: "tee-m-black",
          price: 890,
          salePrice: 690,
          stock: 0,
          imageHue: 0,
          image: null,
          attributes: { Size: "M", Color: "Black" },
        },
      ],
    });
    const data = productGroupJsonLd(product) as {
      hasVariant: { name: string; offers: { availability: string } }[];
    };
    expect(data.hasVariant).toHaveLength(2);
    expect(data.hasVariant[0].name).toBe("Cotton Crew T-Shirt (S, Black)");
    expect(data.hasVariant[1].offers.availability).toBe("https://schema.org/OutOfStock");
  });
});

describe("itemListJsonLd", () => {
  it("numbers each item by position and builds an absolute url", () => {
    const data = itemListJsonLd([
      { name: "Tee", path: "/product/tee" },
      { name: "Shoes", path: "/product/shoes" },
    ]) as { itemListElement: { position: number; url: string }[] };
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(data.itemListElement[0].url).toContain("/product/tee");
  });
});

describe("videoObjectJsonLd", () => {
  it("builds a VideoObject from a youtube.com watch URL", () => {
    const data = videoObjectJsonLd({
      name: "How to style it",
      description: "A styling guide",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      uploadDate: "2026-01-01",
    });
    expect(data).toMatchObject({
      "@type": "VideoObject",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnailUrl: ["https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
    });
  });

  it("returns null for a URL with no extractable video id", () => {
    expect(
      videoObjectJsonLd({ name: "x", description: "x", youtubeUrl: "not a url" }),
    ).toBeNull();
  });
});
