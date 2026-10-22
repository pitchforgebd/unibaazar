import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { activeFlashSalePrice } from "@/server/catalog/flash";
import { ApiError } from "@/server/http";
import { readSession } from "@/server/auth/session";
import { TAGS } from "@/server/cache/tags";
import type { QuestionInput, ReviewInput } from "@/lib/validation/customer";
import type { Product, ProductAttribute, Review } from "@/types/catalog";

// 5 minutes matches the timer this project already used for blog/CMS ISR
// before this phase; on-demand revalidateTag() calls from admin writes
// (see src/app/(admin)/admin/catalog-actions.ts) make updates show up
// immediately in practice — this is just the safety-net ceiling.
const CATALOG_REVALIDATE_SECONDS = 300;

const productInclude = {
  brand: true,
  categories: { include: { category: true } },
  attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: {
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: {
      attributes: { include: { attribute: true, attributeValue: true } },
      flashItems: { include: { flashSale: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function money(value: Prisma.Decimal): number {
  return value.toNumber();
}

function flashActive(row: ProductRow): boolean {
  const now = Date.now();
  return row.variants.some((variant) =>
    variant.flashItems.some((item) => {
      const sale = item.flashSale;
      return (
        sale.isActive && sale.startsAt.getTime() <= now && sale.endsAt.getTime() >= now
      );
    }),
  );
}

function attributeOptions(row: ProductRow): ProductAttribute[] {
  return row.attributes.map((link) => {
    const used = new Map<string, { label: string; swatch?: string; sort: number }>();
    for (const variant of row.variants) {
      for (const valueLink of variant.attributes) {
        if (valueLink.attributeId !== link.attributeId) {
          continue;
        }
        used.set(valueLink.attributeValueId, {
          label: valueLink.attributeValue.label,
          swatch: valueLink.attributeValue.swatch ?? undefined,
          sort: valueLink.attributeValue.sortOrder,
        });
      }
    }
    return {
      name: link.attribute.name,
      style: link.attribute.style === "SWATCH" ? "swatch" : "button",
      values: [...used.values()]
        .sort((a, b) => a.sort - b.sort)
        .map(({ label, swatch }) => ({ label, swatch })),
    };
  });
}

export function toProduct(row: ProductRow): Product {
  const category = row.categories[0]?.category;
  const productImages = row.images
    .filter((image) => !image.variantId)
    .map((image) => ({ url: image.url, alt: image.alt }));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandSlug: row.brand.slug,
    brandName: row.brand.name,
    categorySlug: category?.slug ?? "",
    rating: money(row.rating),
    reviewCount: row.reviewCount,
    imageHue: row.imageHue ?? 0,
    shortDescription: row.shortDescription,
    description: row.description,
    warranty: row.warranty,
    returns: row.returns,
    videoUrl: row.videoUrl ?? "",
    featured: row.featured,
    bestSeller: row.bestSeller,
    isNew: row.isNew,
    flashSale: flashActive(row),
    createdAt: row.createdAt.toISOString().slice(0, 10),
    attributes: attributeOptions(row),
    images: productImages,
    variants: row.variants.map((variant) => {
      const variantImage = row.images.find((image) => image.variantId === variant.id);
      const flashPrice = activeFlashSalePrice(variant.flashItems);
      return {
        id: variant.id,
        sku: variant.sku,
        price: money(variant.price),
        salePrice:
          flashPrice ?? (variant.salePrice === null ? null : money(variant.salePrice)),
        stock: variant.stock,
        imageHue: variant.imageHue ?? row.imageHue ?? 0,
        image: variantImage ? { url: variantImage.url, alt: variantImage.alt } : null,
        attributes: Object.fromEntries(
          variant.attributes.map((link) => [
            link.attribute.name,
            link.attributeValue.label,
          ]),
        ),
      };
    }),
  };
}

export const listStoreCategories = unstable_cache(
  async (): Promise<{ slug: string; name: string; hue: number }[]> => {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, imageHue: true },
    });
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      hue: row.imageHue ?? 0,
    }));
  },
  ["store-categories"],
  { tags: [TAGS.categories], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export async function listStoreCategorySlugs(): Promise<string[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export function getStoreCategory(slug: string): Promise<{
  slug: string;
  name: string;
  description: string;
  seoText: string;
} | null> {
  // Tags are evaluated per call (via closure over `slug`), not fixed at
  // wrap time, so revalidateTag(TAGS.category(slug)) can target just this
  // one category instead of every cached category.
  return unstable_cache(
    async () => {
      const row = await prisma.category.findFirst({ where: { slug, isActive: true } });
      return row
        ? {
            slug: row.slug,
            name: row.name,
            description: row.description,
            seoText: row.seoText,
          }
        : null;
    },
    ["store-category", slug],
    {
      tags: [TAGS.categories, TAGS.category(slug)],
      revalidate: CATALOG_REVALIDATE_SECONDS,
    },
  )();
}

export async function listStoreBrandSlugs(): Promise<string[]> {
  const rows = await prisma.brand.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export const listStoreBrands = unstable_cache(
  async (): Promise<{ slug: string; name: string }[]> => {
    return prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    });
  },
  ["store-brands"],
  { tags: [TAGS.brands], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export function getStoreBrand(
  slug: string,
): Promise<{ slug: string; name: string; description: string } | null> {
  return unstable_cache(
    async () => {
      const row = await prisma.brand.findFirst({ where: { slug, isActive: true } });
      return row
        ? { slug: row.slug, name: row.name, description: row.description }
        : null;
    },
    ["store-brand", slug],
    { tags: [TAGS.brands, TAGS.brand(slug)], revalidate: CATALOG_REVALIDATE_SECONDS },
  )();
}

export async function listStoreProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export const listStoreProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({
      where: { status: "PUBLISHED" },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toProduct);
  },
  ["store-products"],
  { tags: [TAGS.products], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export function getStoreProduct(slug: string): Promise<Product | null> {
  return unstable_cache(
    async () => {
      const row = await prisma.product.findFirst({
        where: { slug, status: "PUBLISHED" },
        include: productInclude,
      });
      return row ? toProduct(row) : null;
    },
    ["store-product", slug],
    { tags: [TAGS.products, TAGS.product(slug)], revalidate: CATALOG_REVALIDATE_SECONDS },
  )();
}

export async function getStoreReviews(slug: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { status: "APPROVED", product: { slug } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((review) => ({
    id: review.id,
    productSlug: slug,
    author: review.authorName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  }));
}

export async function getStoreQuestions(slug: string) {
  const rows = await prisma.productQuestion.findMany({
    where: { product: { slug }, answer: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((question) => ({
    id: question.id,
    productSlug: slug,
    question: question.question,
    author: question.authorName,
    answer: question.answer ?? "",
  }));
}

async function currentCustomer() {
  const session = await readSession();
  if (!session) {
    throw new ApiError(401, "Sign in to continue");
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    throw new ApiError(401, "Sign in again");
  }
  return user;
}

export async function submitProductReview(
  slug: string,
  input: ReviewInput,
): Promise<void> {
  const user = await currentCustomer();
  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  await prisma.review.create({
    data: {
      productId: product.id,
      userId: user.id,
      authorName: user.name,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

export async function submitProductQuestion(
  slug: string,
  input: QuestionInput,
): Promise<void> {
  const user = await currentCustomer();
  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  await prisma.productQuestion.create({
    data: {
      productId: product.id,
      userId: user.id,
      authorName: user.name,
      question: input.question,
    },
  });
}
