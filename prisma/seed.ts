import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { siteConfig } from "../src/config/site";
import {
  brands,
  categories,
  coupons,
  flashSaleEndsAt,
  products,
  questions,
  reviews,
} from "../src/lib/mock/catalog";
import { blogPosts, cmsPages, heroSlides, sideBanners } from "../src/lib/mock/content";
import { permissions, roleGrants } from "../src/server/security/permissions";

const prisma = new PrismaClient();

const roles = [
  { slug: "super-admin", name: "Super Admin" },
  { slug: "admin", name: "Admin" },
  { slug: "manager", name: "Manager" },
  { slug: "staff", name: "Staff" },
  { slug: "content-editor", name: "Content Editor" },
  { slug: "accountant", name: "Accountant" },
  { slug: "customer", name: "Customer" },
] as const;

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

async function main(): Promise<void> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name },
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: { name: permission.name },
      create: permission,
    });
  }
  for (const [roleSlug, grants] of Object.entries(roleGrants)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: roleSlug } });
    for (const permissionSlug of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { slug: permissionSlug },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

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
        where: { productId_categoryId: { productId: saved.id, categoryId: category.id } },
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
      const row = await prisma.productVariant.findUnique({ where: { sku: variant.sku } });
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
        sortOrder: index,
      },
      create: {
        id: `banner-${index + 1}`,
        title: banner.title,
        href: banner.href,
        imageHue: banner.hue,
        placement: "home-side",
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

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "admin" } });
  const adminPassword = await bcrypt.hash("pass1234", 10);
  await prisma.user.upsert({
    where: { phone: "01700000000" },
    update: {
      name: "Admin",
      email: "admin@unibaazar.com",
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
    create: {
      roleId: adminRole.id,
      name: "Admin",
      phone: "01700000000",
      email: "admin@unibaazar.com",
      passwordHash: adminPassword,
    },
  });

  const customerRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "customer" },
  });
  const passwordHash = await bcrypt.hash("pass1234", 10);
  const user = await prisma.user.upsert({
    where: { phone: "01711111111" },
    update: {
      name: "Rahim Ahmed",
      email: "rahim@example.com",
      passwordHash,
      roleId: customerRole.id,
    },
    create: {
      roleId: customerRole.id,
      name: "Rahim Ahmed",
      phone: "01711111111",
      email: "rahim@example.com",
      passwordHash,
    },
  });
  await prisma.customer.upsert({
    where: { phone: "01711111111" },
    update: { name: "Rahim Ahmed", email: "rahim@example.com", userId: user.id },
    create: {
      userId: user.id,
      name: "Rahim Ahmed",
      phone: "01711111111",
      email: "rahim@example.com",
    },
  });

  const existingOrder = await prisma.order.findUnique({ where: { number: "UB10021" } });
  if (!existingOrder) {
    const tee = await prisma.productVariant.findUnique({ where: { sku: "TEE-M-BLK" } });
    const faceWash = await prisma.productVariant.findUnique({
      where: { sku: "NEEM-FW-100" },
    });
    const customer = await prisma.customer.findUnique({
      where: { phone: "01711111111" },
    });
    if (tee && faceWash && customer) {
      await prisma.order.create({
        data: {
          number: "UB10021",
          trackingId: "SF10021BD",
          userId: user.id,
          customerId: customer.id,
          name: "Rahim Ahmed",
          phone: "01711111111",
          email: "rahim@example.com",
          addressLine: "House 12, Road 4, Dhanmondi, Dhaka",
          area: "INSIDE_DHAKA",
          paymentMethod: "COD",
          subtotal: money(1620),
          discount: money(0),
          deliveryCharge: money(70),
          total: money(1690),
          status: "DELIVERED",
          placedAt: new Date("2026-10-01T10:12:00+06:00"),
          items: {
            create: [
              {
                variantId: tee.id,
                name: "Cotton Crew T-Shirt (M / Black)",
                sku: tee.sku,
                qty: 2,
                unitPrice: money(690),
                lineTotal: money(1380),
              },
              {
                variantId: faceWash.id,
                name: "Neem Face Wash",
                sku: faceWash.sku,
                qty: 1,
                unitPrice: money(240),
                lineTotal: money(240),
              },
            ],
          },
          statusHistory: {
            create: [
              { status: "PENDING", createdAt: new Date("2026-10-01T10:12:00+06:00") },
              { status: "CONFIRMED", createdAt: new Date("2026-10-01T10:20:00+06:00") },
              { status: "PROCESSING", createdAt: new Date("2026-10-01T14:05:00+06:00") },
              { status: "SHIPPED", createdAt: new Date("2026-10-02T09:40:00+06:00") },
              { status: "DELIVERED", createdAt: new Date("2026-10-02T16:10:00+06:00") },
            ],
          },
          payments: {
            create: { method: "COD", status: "PAID", amount: money(1690) },
          },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
