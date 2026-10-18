import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";
import {
  brands,
  categories,
  coupons,
  flashSaleEndsAt,
  products,
  questions,
  reviews,
} from "@/lib/mock/catalog";
import { blogPosts, cmsPages, heroSlides, sideBanners } from "@/lib/mock/content";

// Migrated from the old `/api/v1/cron/seed-catalog` route (deleted — see
// ARCHITECTURE.md §9). Same reasoning as the route it replaces: `tsx
// prisma/seed.ts` can't start on this host (fresh-process Prisma/esbuild cold
// start fails — ARCHITECTURE.md §12), so this upserts the demo catalog,
// content, and settings from inside the already-running, already-warm app
// process instead — now triggered from Admin → Maintenance rather than a
// curl'd cron route. Every write below is an upsert keyed on a stable slug/
// id/sku, so running this twice in a row is a no-op the second time.

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export type SeedCatalogResult = {
  categories: number;
  brands: number;
  products: number;
};

export async function seedDemoCatalog(): Promise<SeedCatalogResult> {
  const size = await prisma.attribute.upsert({
    where: { slug: "size" },
    update: { name: "Size", style: "BUTTON" },
    create: { slug: "size", name: "Size", style: "BUTTON" },
  });
  const color = await prisma.attribute.upsert({
    where: { slug: "color" },
    update: { name: "Color", style: "SWATCH" },
    create: { slug: "color", name: "Color", style: "SWATCH" },
  });

  const sizeLabels = new Set<string>();
  const colorValues = new Map<string, string | undefined>();
  for (const product of products) {
    for (const attribute of product.attributes) {
      for (const value of attribute.values) {
        if (attribute.name === "Size") {
          sizeLabels.add(value.label);
        }
        if (attribute.name === "Color") {
          colorValues.set(value.label, value.swatch);
        }
      }
    }
  }
  const sizeRank = ["S", "M", "L", "XL", "XXL"];
  const orderedSizes = [...sizeLabels].sort((left, right) => {
    const leftRank = sizeRank.indexOf(left);
    const rightRank = sizeRank.indexOf(right);
    return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
  });
  for (const [index, label] of orderedSizes.entries()) {
    await prisma.attributeValue.upsert({
      where: { attributeId_label: { attributeId: size.id, label } },
      update: { sortOrder: index },
      create: { attributeId: size.id, label, sortOrder: index },
    });
  }
  let colorSort = 0;
  for (const [label, swatch] of colorValues) {
    await prisma.attributeValue.upsert({
      where: { attributeId_label: { attributeId: color.id, label } },
      update: { swatch: swatch ?? null, sortOrder: colorSort },
      create: {
        attributeId: color.id,
        label,
        swatch: swatch ?? null,
        sortOrder: colorSort,
      },
    });
    colorSort += 1;
  }

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        seoText: category.seoText,
        imageHue: category.hue,
        sortOrder: index,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        seoText: category.seoText,
        imageHue: category.hue,
        sortOrder: index,
      },
    });
  }

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description },
      create: { slug: brand.slug, name: brand.name, description: brand.description },
    });
  }

  for (const product of products) {
    const basePrice = Math.min(...product.variants.map((variant) => variant.price));
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        warranty: product.warranty,
        returns: product.returns,
        basePrice: money(basePrice),
        rating: money(product.rating),
        reviewCount: product.reviewCount,
        imageHue: product.imageHue,
        featured: product.featured,
        bestSeller: product.bestSeller,
        isNew: product.isNew,
        status: "PUBLISHED",
        type: product.attributes.length > 0 ? "VARIABLE" : "SIMPLE",
      },
      create: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        warranty: product.warranty,
        returns: product.returns,
        basePrice: money(basePrice),
        rating: money(product.rating),
        reviewCount: product.reviewCount,
        imageHue: product.imageHue,
        featured: product.featured,
        bestSeller: product.bestSeller,
        isNew: product.isNew,
        status: "PUBLISHED",
        type: product.attributes.length > 0 ? "VARIABLE" : "SIMPLE",
        brand: { connect: { slug: product.brandSlug } },
        createdAt: new Date(`${product.createdAt}T00:00:00+06:00`),
      },
    });

    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug },
    });
    if (category) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: { productId: saved.id, categoryId: category.id },
        },
        update: {},
        create: { productId: saved.id, categoryId: category.id },
      });
    }

    for (const [index, attribute] of product.attributes.entries()) {
      const attributeId = attribute.name === "Color" ? color.id : size.id;
      await prisma.productAttribute.upsert({
        where: { productId_attributeId: { productId: saved.id, attributeId } },
        update: { sortOrder: index },
        create: { productId: saved.id, attributeId, sortOrder: index },
      });
    }

    for (const variant of product.variants) {
      const row = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          price: money(variant.price),
          salePrice: variant.salePrice === null ? null : money(variant.salePrice),
          stock: variant.stock,
          imageHue: variant.imageHue,
          isDefault: product.attributes.length === 0,
          status: "ACTIVE",
        },
        create: {
          id: variant.id,
          productId: saved.id,
          sku: variant.sku,
          price: money(variant.price),
          salePrice: variant.salePrice === null ? null : money(variant.salePrice),
          stock: variant.stock,
          imageHue: variant.imageHue,
          isDefault: product.attributes.length === 0,
        },
      });
      await prisma.variantAttributeValue.deleteMany({ where: { variantId: row.id } });
      for (const [name, label] of Object.entries(variant.attributes)) {
        const attributeId = name === "Color" ? color.id : size.id;
        const value = await prisma.attributeValue.findUnique({
          where: { attributeId_label: { attributeId, label } },
        });
        if (!value) {
          continue;
        }
        await prisma.variantAttributeValue.create({
          data: { variantId: row.id, attributeId, attributeValueId: value.id },
        });
      }
    }
  }

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type === "percent" ? "PERCENT" : "FIXED",
        value: money(coupon.value),
        minSubtotal: money(coupon.minSubtotal),
        isActive: true,
      },
      create: {
        code: coupon.code,
        type: coupon.type === "percent" ? "PERCENT" : "FIXED",
        value: money(coupon.value),
        minSubtotal: money(coupon.minSubtotal),
      },
    });
  }

  const flash = await prisma.flashSale.upsert({
    where: { id: "flash-week" },
    update: { endsAt: new Date(flashSaleEndsAt), isActive: true },
    create: {
      id: "flash-week",
      name: "Flash deals this week",
      startsAt: new Date("2026-10-01T00:00:00+06:00"),
      endsAt: new Date(flashSaleEndsAt),
    },
  });
  for (const product of products.filter((item) => item.flashSale)) {
    for (const variant of product.variants) {
      if (variant.salePrice === null) {
        continue;
      }
      const row = await prisma.productVariant.findUnique({
        where: { sku: variant.sku },
      });
      if (!row) {
        continue;
      }
      await prisma.flashSaleItem.upsert({
        where: { flashSaleId_variantId: { flashSaleId: flash.id, variantId: row.id } },
        update: { salePrice: money(variant.salePrice) },
        create: {
          flashSaleId: flash.id,
          variantId: row.id,
          salePrice: money(variant.salePrice),
        },
      });
    }
  }

  for (const review of reviews) {
    const product = await prisma.product.findUnique({
      where: { slug: review.productSlug },
    });
    if (!product) {
      continue;
    }
    await prisma.review.upsert({
      where: { id: review.id },
      update: { comment: review.comment, rating: review.rating, status: "APPROVED" },
      create: {
        id: review.id,
        productId: product.id,
        authorName: review.author,
        rating: review.rating,
        comment: review.comment,
        status: "APPROVED",
        createdAt: new Date(`${review.createdAt}T00:00:00+06:00`),
      },
    });
  }

  for (const question of questions) {
    const product = await prisma.product.findUnique({
      where: { slug: question.productSlug },
    });
    if (!product) {
      continue;
    }
    await prisma.productQuestion.upsert({
      where: { id: question.id },
      update: { answer: question.answer },
      create: {
        id: question.id,
        productId: product.id,
        authorName: question.author,
        question: question.question,
        answer: question.answer,
        answeredAt: new Date(),
      },
    });
  }

  for (const page of cmsPages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        body: page.paragraphs.join("\n\n"),
        status: "PUBLISHED",
      },
      create: {
        slug: page.slug,
        title: page.title,
        body: page.paragraphs.join("\n\n"),
        status: "PUBLISHED",
      },
    });
  }

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content.join("\n\n"),
        status: "PUBLISHED",
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content.join("\n\n"),
        authorName: post.author,
        imageHue: post.hue,
        status: "PUBLISHED",
        publishedAt: new Date(`${post.date}T00:00:00+06:00`),
      },
    });
  }

  for (const [index, slide] of heroSlides.entries()) {
    await prisma.slider.upsert({
      where: { id: `slide-${index + 1}` },
      update: {
        title: slide.title,
        subtitle: slide.text,
        href: slide.href,
        imageHue: slide.hue,
        sortOrder: index,
      },
      create: {
        id: `slide-${index + 1}`,
        title: slide.title,
        subtitle: slide.text,
        href: slide.href,
        imageHue: slide.hue,
        sortOrder: index,
      },
    });
  }

  for (const [index, banner] of sideBanners.entries()) {
    await prisma.banner.upsert({
      where: { id: `banner-${index + 1}` },
      update: {
        title: banner.title,
        href: banner.href,
        imageHue: banner.hue,
        placement: "home",
        sortOrder: index,
      },
      create: {
        id: `banner-${index + 1}`,
        title: banner.title,
        href: banner.href,
        imageHue: banner.hue,
        placement: "home",
        sortOrder: index,
      },
    });
  }

  const serviceMenu = await prisma.menu.upsert({
    where: { location: "footer-service" },
    update: { name: "Customer Service" },
    create: { location: "footer-service", name: "Customer Service" },
  });
  for (const [index, link] of siteConfig.customerServiceLinks.entries()) {
    await prisma.menuItem.upsert({
      where: { id: `menu-service-${link.id}` },
      update: { label: link.label, href: link.href, sortOrder: index },
      create: {
        id: `menu-service-${link.id}`,
        menuId: serviceMenu.id,
        label: link.label,
        href: link.href,
        sortOrder: index,
      },
    });
  }

  const settings: { key: string; value: Prisma.InputJsonValue }[] = [
    { key: "delivery.inside", value: 70 },
    { key: "delivery.outside", value: 130 },
    { key: "delivery.freeFrom", value: siteConfig.freeShippingThreshold },
    { key: "store.name", value: siteConfig.name },
  ];
  for (const key of [
    "security.blockedIps",
    "security.blockedPhones",
    "security.adminIpAllowlist",
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: [] },
    });
  }
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  return {
    categories: categories.length,
    brands: brands.length,
    products: products.length,
  };
}
