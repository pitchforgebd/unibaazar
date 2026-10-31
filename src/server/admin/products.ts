import { Prisma, type PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { visibleText } from "@/lib/text/visibleText";
import { parseCsv, productCsvColumns, toCsv } from "@/server/admin/csv";
import {
  bulkSchema,
  importCsvSchema,
  productFormSchema,
  quickEditSchema,
  type ProductFormValues,
} from "@/lib/validation/admin-catalog";

export type ProductListQuery = {
  q: string;
  categoryId: string;
  brandId: string;
  status: "" | PublishStatus;
  stock: "" | "in" | "out" | "low";
  page: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  status: PublishStatus;
  brand: string;
  categories: string;
  sku: string;
  price: number;
  stock: number;
  low: boolean;
};

export type CatalogOptions = {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; depth: number }[];
  units: { id: string; name: string }[];
  labels: { id: string; name: string }[];
  attributes: {
    id: string;
    name: string;
    values: { id: string; label: string; swatch: string | null }[];
  }[];
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function parseProductListQuery(
  raw: Record<string, string | string[] | undefined>,
): ProductListQuery {
  const status = one(raw.status);
  const stock = one(raw.stock);
  const page = Number(one(raw.page));
  return {
    q: one(raw.q).trim().slice(0, 80),
    categoryId: one(raw.category),
    brandId: one(raw.brand),
    status:
      status === "DRAFT" || status === "PUBLISHED" || status === "SCHEDULED"
        ? status
        : "",
    stock: stock === "in" || stock === "out" || stock === "low" ? stock : "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function moneyInput(value: Prisma.Decimal | null): string {
  if (value === null) {
    return "";
  }
  const text = value.toFixed(2);
  return text.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function dhakaInput(date: Date | null): string {
  if (!date) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function fromDhaka(value: string): Date | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}:00+06:00`);
}

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function optionalDecimal(value: string): Prisma.Decimal | null {
  return value.trim() === "" ? null : new Prisma.Decimal(value);
}

function splitTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags.slice(0, 20);
}

function readTags(value: Prisma.JsonValue): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value.filter((item): item is string => typeof item === "string").join(", ");
}

async function lowStockIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p.id AS id
    FROM Product p
    INNER JOIN ProductVariant v ON v.productId = p.id
    WHERE v.status = 'ACTIVE' AND v.stock > 0 AND v.stock <= p.lowStockThreshold
  `;
  return rows.map((row) => row.id);
}

async function productWhere(query: ProductListQuery): Promise<Prisma.ProductWhereInput> {
  const filters: Prisma.ProductWhereInput[] = [];
  if (query.q) {
    filters.push({
      OR: [
        { name: { contains: query.q } },
        { slug: { contains: query.q } },
        { variants: { some: { sku: { contains: query.q } } } },
      ],
    });
  }
  if (query.brandId) {
    filters.push({ brandId: query.brandId });
  }
  if (query.categoryId) {
    filters.push({ categories: { some: { categoryId: query.categoryId } } });
  }
  if (query.status) {
    filters.push({ status: query.status });
  }
  if (query.stock === "in") {
    filters.push({ variants: { some: { status: "ACTIVE", stock: { gt: 0 } } } });
  }
  if (query.stock === "out") {
    filters.push({
      variants: {
        some: { status: "ACTIVE" },
        none: { status: "ACTIVE", stock: { gt: 0 } },
      },
    });
  }
  if (query.stock === "low") {
    const ids = await lowStockIds();
    filters.push({ id: { in: ids } });
  }
  return filters.length > 0 ? { AND: filters } : {};
}

const pageSize = 20;

export async function listAdminProducts(query: ProductListQuery): Promise<{
  rows: AdminProductRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const where = await productWhere(query);
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pages);
  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { name: true } },
      categories: { include: { category: { select: { name: true } } } },
      variants: {
        select: { sku: true, price: true, stock: true, isDefault: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    total,
    page,
    pages,
    rows: products.map((product) => {
      const active = product.variants.filter((variant) => variant.status === "ACTIVE");
      const priced = active.length > 0 ? active : product.variants;
      const chosen = priced.find((variant) => variant.isDefault) ?? priced[0];
      const stock = active.reduce((sum, variant) => sum + variant.stock, 0);
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        brand: product.brand.name,
        categories: product.categories.map((link) => link.category.name).join(", "),
        sku: chosen?.sku ?? "",
        price: chosen ? chosen.price.toNumber() : product.basePrice.toNumber(),
        stock,
        low: active.some((variant) => variant.stock <= product.lowStockThreshold),
      };
    }),
  };
}

function withDepth<
  T extends { id: string; parentId: string | null; sortOrder: number; name: string },
>(rows: T[]): (T & { depth: number })[] {
  const byParent = new Map<string | null, T[]>();
  for (const row of rows) {
    const group = byParent.get(row.parentId) ?? [];
    group.push(row);
    byParent.set(row.parentId, group);
  }
  for (const group of byParent.values()) {
    group.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }
  const ordered: (T & { depth: number })[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      if (seen.has(row.id)) {
        continue;
      }
      seen.add(row.id);
      ordered.push({ ...row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const row of rows) {
    if (!seen.has(row.id)) {
      ordered.push({ ...row, depth: 0 });
    }
  }
  return ordered;
}

export async function loadCatalogOptions(): Promise<CatalogOptions> {
  const [brands, categories, units, labels, attributes] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
    prisma.unit.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.label.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.attribute.findMany({
      orderBy: { name: "asc" },
      include: {
        values: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, swatch: true },
        },
      },
    }),
  ]);
  return {
    brands,
    categories: withDepth(categories).map((category) => ({
      id: category.id,
      name: category.name,
      depth: category.depth,
    })),
    units,
    labels,
    attributes: attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      values: attribute.values,
    })),
  };
}

export function emptyProductForm(brandId = ""): ProductFormValues {
  return {
    id: "",
    name: "",
    slug: "",
    type: "SIMPLE",
    status: "DRAFT",
    brandId,
    unitId: "",
    categoryIds: [],
    labelIds: [],
    tags: "",
    shortDescription: "",
    description: "",
    warranty: "",
    returns: "",
    basePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    publishedAt: "",
    lowStockThreshold: "5",
    weightGrams: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    shippingClass: "",
    videoUrl: "",
    featured: false,
    bestSeller: false,
    isNew: false,
    metaTitle: "",
    metaDescription: "",
    canonical: "",
    ogImage: "",
    focusKeyword: "",
    noIndex: false,
    attributeIds: [],
    images: [],
    variants: [
      {
        id: "",
        sku: "",
        price: "",
        salePrice: "",
        costPrice: "",
        stock: "0",
        imageUrl: "",
        status: "ACTIVE",
        isDefault: true,
        valueIds: [],
      },
    ],
  };
}

export async function loadProductForm(id: string): Promise<ProductFormValues | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: true,
      labels: true,
      attributes: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: { createdAt: "asc" },
        include: { attributes: true },
      },
    },
  });
  if (!product) {
    return null;
  }
  const seo = await prisma.seoMeta.findUnique({
    where: { entityType_entityId: { entityType: "PRODUCT", entityId: product.id } },
  });
  const base = moneyInput(product.basePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: product.type,
    status: product.status,
    brandId: product.brandId,
    unitId: product.unitId ?? "",
    categoryIds: product.categories.map((link) => link.categoryId),
    labelIds: product.labels.map((link) => link.labelId),
    tags: readTags(product.tags),
    shortDescription: product.shortDescription,
    description: product.description,
    warranty: product.warranty,
    returns: product.returns,
    basePrice: base,
    saleStartsAt: dhakaInput(product.saleStartsAt),
    saleEndsAt: dhakaInput(product.saleEndsAt),
    publishedAt: dhakaInput(product.publishedAt),
    lowStockThreshold: String(product.lowStockThreshold),
    weightGrams: product.weightGrams === null ? "" : String(product.weightGrams),
    lengthCm: moneyInput(product.lengthCm),
    widthCm: moneyInput(product.widthCm),
    heightCm: moneyInput(product.heightCm),
    shippingClass: product.shippingClass ?? "",
    videoUrl: product.videoUrl ?? "",
    featured: product.featured,
    bestSeller: product.bestSeller,
    isNew: product.isNew,
    metaTitle: seo?.metaTitle ?? "",
    metaDescription: seo?.metaDescription ?? "",
    canonical: seo?.canonical ?? "",
    ogImage: seo?.ogImage ?? "",
    focusKeyword: seo?.focusKeyword ?? "",
    noIndex: seo?.noIndex ?? false,
    attributeIds: product.attributes.map((link) => link.attributeId),
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: moneyInput(variant.price),
      salePrice: moneyInput(variant.salePrice),
      costPrice: moneyInput(variant.costPrice),
      stock: String(variant.stock),
      imageUrl: variant.imageUrl ?? "",
      status: variant.status,
      isDefault: variant.isDefault,
      valueIds: variant.attributes.map((link) => link.attributeValueId),
    })),
  };
}

async function assertSkuOwners(
  variants: ProductFormValues["variants"],
  productId: string,
): Promise<void> {
  const rows = await prisma.productVariant.findMany({
    where: { sku: { in: variants.map((variant) => variant.sku) } },
    select: { id: true, sku: true, productId: true },
  });
  for (const row of rows) {
    const match = variants.find(
      (variant) => variant.sku.toLowerCase() === row.sku.toLowerCase(),
    );
    if (!match || match.id !== row.id || row.productId !== productId) {
      throw new Error(`SKU ${row.sku} is already used`);
    }
  }
}

export async function saveAdminProduct(
  input: ProductFormValues,
): Promise<{ id: string; note: string }> {
  const parsed = productFormSchema.parse(input);
  const slugOwner = await prisma.product.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (slugOwner && slugOwner.id !== parsed.id) {
    throw new Error("That slug is already used");
  }
  if (parsed.id) {
    await assertSkuOwners(parsed.variants, parsed.id);
  } else {
    await assertSkuOwners(parsed.variants, "");
  }

  const brand = await prisma.brand.findUnique({
    where: { id: parsed.brandId },
    select: { id: true },
  });
  if (!brand) {
    throw new Error("Choose a brand");
  }
  const prices = parsed.variants.map((variant) => Number(variant.price));
  const basePrice = decimal(String(Math.min(Number(parsed.basePrice), ...prices)));
  const publishedAt =
    parsed.status === "PUBLISHED"
      ? (fromDhaka(parsed.publishedAt) ?? new Date())
      : fromDhaka(parsed.publishedAt);
  const data = {
    name: parsed.name,
    slug: parsed.slug,
    type: parsed.type,
    status: parsed.status,
    brandId: parsed.brandId,
    unitId: parsed.unitId || null,
    shortDescription: parsed.shortDescription,
    description: parsed.description,
    warranty: parsed.warranty,
    returns: parsed.returns,
    basePrice,
    videoUrl: parsed.videoUrl || null,
    weightGrams: parsed.weightGrams === "" ? null : Number(parsed.weightGrams),
    lengthCm: optionalDecimal(parsed.lengthCm),
    widthCm: optionalDecimal(parsed.widthCm),
    heightCm: optionalDecimal(parsed.heightCm),
    shippingClass: parsed.shippingClass || null,
    lowStockThreshold: Number(parsed.lowStockThreshold),
    tags: splitTags(parsed.tags),
    featured: parsed.featured,
    bestSeller: parsed.bestSeller,
    isNew: parsed.isNew,
    saleStartsAt: fromDhaka(parsed.saleStartsAt),
    saleEndsAt: fromDhaka(parsed.saleEndsAt),
    publishedAt,
  };

  const keptInactive: string[] = [];
  const id = await prisma.$transaction(async (tx) => {
    const product = parsed.id
      ? await tx.product.update({ where: { id: parsed.id }, data })
      : await tx.product.create({ data });

    if (parsed.categoryIds.length === 0) {
      await tx.productCategory.deleteMany({ where: { productId: product.id } });
    } else {
      await tx.productCategory.deleteMany({
        where: { productId: product.id, categoryId: { notIn: parsed.categoryIds } },
      });
      for (const categoryId of parsed.categoryIds) {
        await tx.productCategory.upsert({
          where: { productId_categoryId: { productId: product.id, categoryId } },
          update: {},
          create: { productId: product.id, categoryId },
        });
      }
    }

    if (parsed.labelIds.length === 0) {
      await tx.productLabel.deleteMany({ where: { productId: product.id } });
    } else {
      await tx.productLabel.deleteMany({
        where: { productId: product.id, labelId: { notIn: parsed.labelIds } },
      });
      for (const labelId of parsed.labelIds) {
        await tx.productLabel.upsert({
          where: { productId_labelId: { productId: product.id, labelId } },
          update: {},
          create: { productId: product.id, labelId },
        });
      }
    }

    const imageIds = parsed.images
      .map((image) => image.id)
      .filter((imageId) => imageId !== "");
    await tx.productImage.deleteMany({
      where: {
        productId: product.id,
        ...(imageIds.length > 0 ? { id: { notIn: imageIds } } : {}),
      },
    });
    for (const [index, image] of parsed.images.entries()) {
      if (image.id) {
        await tx.productImage.update({
          where: { id: image.id },
          data: {
            url: image.url,
            alt: image.alt.trim() || parsed.name,
            sortOrder: index,
          },
        });
      } else {
        await tx.productImage.create({
          data: {
            productId: product.id,
            url: image.url,
            alt: image.alt.trim() || parsed.name,
            sortOrder: index,
          },
        });
      }
    }

    if (parsed.attributeIds.length === 0) {
      await tx.productAttribute.deleteMany({ where: { productId: product.id } });
    } else {
      await tx.productAttribute.deleteMany({
        where: { productId: product.id, attributeId: { notIn: parsed.attributeIds } },
      });
      for (const [index, attributeId] of parsed.attributeIds.entries()) {
        await tx.productAttribute.upsert({
          where: { productId_attributeId: { productId: product.id, attributeId } },
          update: { sortOrder: index },
          create: { productId: product.id, attributeId, sortOrder: index },
        });
      }
    }

    const keptIds = parsed.variants
      .map((variant) => variant.id)
      .filter((variantId) => variantId !== "");
    const existing = await tx.productVariant.findMany({
      where: { productId: product.id },
      select: { id: true, sku: true, _count: { select: { orderItems: true } } },
    });
    for (const row of existing) {
      if (keptIds.includes(row.id)) {
        continue;
      }
      if (row._count.orderItems > 0) {
        await tx.productVariant.update({
          where: { id: row.id },
          data: { status: "INACTIVE" },
        });
        keptInactive.push(row.sku);
      } else {
        await tx.productVariant.delete({ where: { id: row.id } });
      }
    }

    let defaultAssigned = false;
    for (const variant of parsed.variants) {
      const isDefault =
        !defaultAssigned &&
        (parsed.type === "SIMPLE" || variant.isDefault || parsed.variants.length === 1);
      if (isDefault) {
        defaultAssigned = true;
      }
      const variantData = {
        sku: variant.sku,
        price: decimal(variant.price),
        salePrice: optionalDecimal(variant.salePrice),
        costPrice: optionalDecimal(variant.costPrice),
        stock: Number(variant.stock),
        imageUrl: variant.imageUrl || null,
        isDefault,
        status: variant.status,
      };
      let savedId = variant.id;
      if (savedId) {
        const owner = await tx.productVariant.findFirst({
          where: { id: savedId, productId: product.id },
          select: { id: true },
        });
        if (!owner) {
          throw new Error("A variant on this form does not belong to the product");
        }
        await tx.productVariant.update({ where: { id: savedId }, data: variantData });
      } else {
        const created = await tx.productVariant.create({
          data: { ...variantData, productId: product.id },
        });
        savedId = created.id;
      }
      const saved = { id: savedId };
      await tx.variantAttributeValue.deleteMany({ where: { variantId: saved.id } });
      if (parsed.type === "VARIABLE") {
        for (const attributeValueId of variant.valueIds) {
          const value = await tx.attributeValue.findUnique({
            where: { id: attributeValueId },
            select: { attributeId: true },
          });
          if (!value) {
            throw new Error("One of the variant options no longer exists");
          }
          await tx.variantAttributeValue.create({
            data: {
              variantId: saved.id,
              attributeId: value.attributeId,
              attributeValueId,
            },
          });
        }
      }
    }

    await tx.seoMeta.upsert({
      where: { entityType_entityId: { entityType: "PRODUCT", entityId: product.id } },
      update: {
        metaTitle: parsed.metaTitle || null,
        metaDescription: parsed.metaDescription || null,
        canonical: parsed.canonical || null,
        ogImage: parsed.ogImage || null,
        focusKeyword: parsed.focusKeyword || null,
        noIndex: parsed.noIndex,
      },
      create: {
        entityType: "PRODUCT",
        entityId: product.id,
        metaTitle: parsed.metaTitle || null,
        metaDescription: parsed.metaDescription || null,
        canonical: parsed.canonical || null,
        ogImage: parsed.ogImage || null,
        focusKeyword: parsed.focusKeyword || null,
        noIndex: parsed.noIndex,
      },
    });

    return product.id;
  });

  if (parsed.status === "PUBLISHED") {
    const { postProductToFacebook } = await import("@/server/auth/oauth");
    await postProductToFacebook({
      name: parsed.name,
      slug: parsed.slug,
      description: visibleText(parsed.shortDescription),
    }).catch(() => undefined);
  }

  const note =
    keptInactive.length > 0
      ? ` Saved. These SKUs stay inactive because they are on orders: ${keptInactive.join(", ")}.`
      : " Product saved.";
  return { id, note };
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const blocked = await prisma.orderItem.count({ where: { variant: { productId: id } } });
  if (blocked > 0) {
    throw new Error("This product is on an order, so it cannot be deleted");
  }
  await prisma.product.delete({ where: { id } });
}

export async function duplicateAdminProduct(id: string): Promise<string> {
  const source = await loadProductForm(id);
  if (!source) {
    throw new Error("Product not found");
  }
  let slug = `${source.slug}-copy`.slice(0, 180);
  let attempt = 2;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${source.slug}-copy-${attempt}`.slice(0, 180);
    attempt += 1;
  }
  const variants = [];
  for (const variant of source.variants) {
    let sku = `${variant.sku}-C`.slice(0, 64);
    let skuAttempt = 2;
    while (
      await prisma.productVariant.findUnique({ where: { sku }, select: { id: true } })
    ) {
      sku = `${variant.sku}-C${skuAttempt}`.slice(0, 64);
      skuAttempt += 1;
    }
    variants.push({ ...variant, id: "", sku, status: "ACTIVE" as const });
  }
  const saved = await saveAdminProduct({
    ...source,
    id: "",
    name: `${source.name} copy`.slice(0, 191),
    slug,
    status: "DRAFT",
    variants,
    images: source.images.map((image) => ({ ...image, id: "" })),
  });
  return saved.id;
}

function applyPrice(
  current: number,
  mode: "set" | "percent" | "amount",
  value: number,
): number {
  const next =
    mode === "set"
      ? value
      : mode === "percent"
        ? current * (1 + value / 100)
        : current + value;
  return Math.round(Math.max(0, next) * 100) / 100;
}

export async function bulkAdminProducts(input: unknown): Promise<string> {
  const parsed = bulkSchema.parse(input);
  if (parsed.action === "publish") {
    await prisma.product.updateMany({
      where: { id: { in: parsed.ids }, publishedAt: null },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await prisma.product.updateMany({
      where: { id: { in: parsed.ids }, publishedAt: { not: null } },
      data: { status: "PUBLISHED" },
    });
    return `Published ${parsed.ids.length} products.`;
  }
  if (parsed.action === "delete") {
    let removed = 0;
    let skipped = 0;
    for (const id of parsed.ids) {
      const blocked = await prisma.orderItem.count({
        where: { variant: { productId: id } },
      });
      if (blocked > 0) {
        skipped += 1;
        continue;
      }
      await prisma.product.delete({ where: { id } });
      removed += 1;
    }
    return skipped > 0
      ? `Deleted ${removed}. Left ${skipped} because they are on orders.`
      : `Deleted ${removed} products.`;
  }
  if (parsed.action === "price") {
    const products = await prisma.product.findMany({
      where: { id: { in: parsed.ids } },
      include: { variants: true },
    });
    for (const product of products) {
      let lowest = Number.POSITIVE_INFINITY;
      for (const variant of product.variants) {
        const price = applyPrice(variant.price.toNumber(), parsed.mode, parsed.value);
        lowest = Math.min(lowest, price);
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { price: decimal(price.toFixed(2)) },
        });
      }
      if (Number.isFinite(lowest)) {
        await prisma.product.update({
          where: { id: product.id },
          data: { basePrice: decimal(lowest.toFixed(2)) },
        });
      }
    }
    return `Updated prices on ${products.length} products.`;
  }
  const category = await prisma.category.findUnique({
    where: { id: parsed.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Choose a category");
  }
  for (const id of parsed.ids) {
    if (parsed.mode === "replace") {
      await prisma.productCategory.deleteMany({ where: { productId: id } });
    }
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: id, categoryId: parsed.categoryId } },
      update: {},
      create: { productId: id, categoryId: parsed.categoryId },
    });
  }
  return `Updated categories on ${parsed.ids.length} products.`;
}

export async function quickEditAdminProduct(input: unknown): Promise<{ slug: string }> {
  const parsed = quickEditSchema.parse(input);
  const [variant, current] = await Promise.all([
    prisma.productVariant.findFirst({
      where: { productId: parsed.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    prisma.product.findUnique({
      where: { id: parsed.id },
      select: { publishedAt: true, slug: true },
    }),
  ]);
  if (!variant || !current) {
    throw new Error("This product has no variant to edit");
  }
  await prisma.product.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      status: parsed.status,
      basePrice: decimal(parsed.price),
      publishedAt:
        parsed.status === "PUBLISHED" && !current.publishedAt ? new Date() : undefined,
    },
  });
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { price: decimal(parsed.price), stock: Number(parsed.stock) },
  });
  return { slug: current.slug };
}

export async function exportProductsCsv(query: ProductListQuery): Promise<string> {
  const where = await productWhere(query);
  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { slug: true } },
      categories: { include: { category: { select: { slug: true } } }, take: 1 },
      variants: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 2000,
  });
  const rows: string[][] = [Array.from(productCsvColumns)];
  for (const product of products) {
    const category = product.categories[0]?.category.slug ?? "";
    for (const variant of product.variants) {
      rows.push([
        product.name,
        product.slug,
        variant.sku,
        moneyInput(variant.price),
        moneyInput(variant.salePrice),
        String(variant.stock),
        product.brand.slug,
        category,
        product.status,
        product.shortDescription
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ]);
    }
  }
  return toCsv(rows);
}

export async function importProductsCsv(csv: string): Promise<string> {
  const parsed = importCsvSchema.parse({ csv });
  if (parsed.csv.startsWith("PK")) {
    throw new Error("Save the Excel workbook as CSV UTF-8, then import that file");
  }
  const table = parseCsv(parsed.csv);
  const header = table[0]?.map((cell) => cell.trim()) ?? [];
  const index = new Map(header.map((name, position) => [name, position]));
  for (const column of ["name", "slug", "sku", "price", "brand"] as const) {
    if (!index.has(column)) {
      throw new Error(`The CSV needs a ${column} column`);
    }
  }
  const body = table.slice(1);
  if (body.length === 0) {
    throw new Error("The CSV has no product rows");
  }
  if (body.length > 200) {
    throw new Error("Import up to 200 rows at a time");
  }
  let created = 0;
  let updated = 0;
  for (const [rowIndex, row] of body.entries()) {
    const cell = (name: string) => (row[index.get(name) ?? -1] ?? "").trim();
    const line = rowIndex + 2;
    const name = cell("name");
    const slug = cell("slug");
    const sku = cell("sku");
    const price = cell("price");
    const brandSlug = cell("brand");
    if (!name || !slug || !sku || !price || !brandSlug) {
      throw new Error(`Row ${line} is missing a name, slug, SKU, price, or brand`);
    }
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      throw new Error(`Row ${line} has a price that is not a number`);
    }
    const brand = await prisma.brand.findUnique({
      where: { slug: brandSlug },
      select: { id: true },
    });
    if (!brand) {
      throw new Error(`Row ${line} uses an unknown brand slug`);
    }
    const categorySlug = cell("category");
    const category = categorySlug
      ? await prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true },
        })
      : null;
    if (categorySlug && !category) {
      throw new Error(`Row ${line} uses an unknown category slug`);
    }
    const statusCell = cell("status");
    const status: PublishStatus =
      statusCell === "PUBLISHED" || statusCell === "SCHEDULED" || statusCell === "DRAFT"
        ? statusCell
        : "DRAFT";
    const salePrice = cell("salePrice");
    const stock = cell("stock") === "" ? 0 : Number(cell("stock"));
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Row ${line} has a stock value that is not a whole number`);
    }
    const shortDescription = cell("shortDescription") || name;
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!product) {
      await prisma.product.create({
        data: {
          name,
          slug,
          type: "SIMPLE",
          status,
          brandId: brand.id,
          shortDescription,
          description: shortDescription,
          warranty: "",
          returns: "",
          basePrice: decimal(price),
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          tags: [],
          categories: category ? { create: { categoryId: category.id } } : undefined,
          variants: {
            create: {
              sku,
              price: decimal(price),
              salePrice:
                salePrice && /^\d+(\.\d{1,2})?$/.test(salePrice)
                  ? decimal(salePrice)
                  : null,
              stock,
              isDefault: true,
            },
          },
        },
      });
      created += 1;
      continue;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: {
        name,
        status,
        brandId: brand.id,
        shortDescription,
        basePrice: decimal(price),
      },
    });
    if (category) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: { productId: product.id, categoryId: category.id },
        },
        update: {},
        create: { productId: product.id, categoryId: category.id },
      });
    }
    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true, productId: true },
    });
    if (variant && variant.productId !== product.id) {
      throw new Error(`Row ${line} uses SKU ${sku}, which belongs to another product`);
    }
    if (variant) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          price: decimal(price),
          salePrice:
            salePrice && /^\d+(\.\d{1,2})?$/.test(salePrice) ? decimal(salePrice) : null,
          stock,
        },
      });
    } else {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku,
          price: decimal(price),
          salePrice:
            salePrice && /^\d+(\.\d{1,2})?$/.test(salePrice) ? decimal(salePrice) : null,
          stock,
        },
      });
    }
    updated += 1;
  }
  return `Imported ${created} new products and updated ${updated}.`;
}
