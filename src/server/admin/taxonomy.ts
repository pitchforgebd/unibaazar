import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  attributeFormSchema,
  attributeValueSchema,
  brandFormSchema,
  categoryFormSchema,
  labelFormSchema,
  tagRenameSchema,
  unitFormSchema,
  type AttributeFormValues,
  type AttributeValueFormValues,
  type BrandFormValues,
  type CategoryFormValues,
  type LabelFormValues,
  type UnitFormValues,
} from "@/lib/validation/admin-catalog";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  productCount: number;
  isActive: boolean;
};

function nest(
  rows: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
    _count: { products: number };
  }[],
): CategoryRow[] {
  const byParent = new Map<string | null, typeof rows>();
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
  const ordered: CategoryRow[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      if (seen.has(row.id)) {
        continue;
      }
      seen.add(row.id);
      ordered.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
        depth,
        productCount: row._count.products,
        isActive: row.isActive,
      });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  return ordered;
}

export async function listCategories(): Promise<CategoryRow[]> {
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
  return nest(rows);
}

export async function loadCategory(id: string): Promise<CategoryFormValues | null> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return null;
  }
  const seo = await prisma.seoMeta.findUnique({
    where: { entityType_entityId: { entityType: "CATEGORY", entityId: category.id } },
  });
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? "",
    description: category.description,
    seoText: category.seoText,
    imageHue: category.imageHue === null ? "" : String(category.imageHue),
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
    metaTitle: seo?.metaTitle ?? "",
    metaDescription: seo?.metaDescription ?? "",
    canonical: seo?.canonical ?? "",
    ogImage: seo?.ogImage ?? "",
    focusKeyword: seo?.focusKeyword ?? "",
    noIndex: seo?.noIndex ?? false,
  };
}

async function categoryCycle(id: string, parentId: string): Promise<boolean> {
  let current: string | null = parentId;
  const seen = new Set<string>();
  while (current) {
    if (current === id || seen.has(current)) {
      return true;
    }
    seen.add(current);
    const parent: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
  }
  return false;
}

async function saveSeo(
  entityType: "CATEGORY" | "BRAND",
  entityId: string,
  metaTitle: string,
  metaDescription: string,
  extra?: {
    canonical: string;
    ogImage: string;
    focusKeyword: string;
    noIndex: boolean;
  },
): Promise<void> {
  await prisma.seoMeta.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    update: {
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      ...(extra
        ? {
            canonical: extra.canonical || null,
            ogImage: extra.ogImage || null,
            focusKeyword: extra.focusKeyword || null,
            noIndex: extra.noIndex,
          }
        : {}),
    },
    create: {
      entityType,
      entityId,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      canonical: extra?.canonical || null,
      ogImage: extra?.ogImage || null,
      focusKeyword: extra?.focusKeyword || null,
      noIndex: extra?.noIndex ?? false,
    },
  });
}

export async function saveCategory(input: CategoryFormValues): Promise<void> {
  const parsed = categoryFormSchema.parse(input);
  const owner = await prisma.category.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (owner && owner.id !== parsed.id) {
    throw new Error("That slug is already used");
  }
  if (parsed.parentId && parsed.id && (await categoryCycle(parsed.id, parsed.parentId))) {
    throw new Error("A category cannot sit inside itself");
  }
  const data = {
    name: parsed.name,
    slug: parsed.slug,
    parentId: parsed.parentId || null,
    description: parsed.description,
    seoText: parsed.seoText,
    imageHue: parsed.imageHue === "" ? null : Number(parsed.imageHue),
    sortOrder: Number(parsed.sortOrder),
    isActive: parsed.isActive,
  };
  const saved = parsed.id
    ? await prisma.category.update({ where: { id: parsed.id }, data })
    : await prisma.category.create({ data });
  await saveSeo("CATEGORY", saved.id, parsed.metaTitle, parsed.metaDescription, {
    canonical: parsed.canonical,
    ogImage: parsed.ogImage,
    focusKeyword: parsed.focusKeyword,
    noIndex: parsed.noIndex,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const [children, products] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.productCategory.count({ where: { categoryId: id } }),
  ]);
  if (children > 0) {
    throw new Error("Move or delete the child categories first");
  }
  if (products > 0) {
    throw new Error("This category still has products");
  }
  await prisma.seoMeta.deleteMany({ where: { entityType: "CATEGORY", entityId: id } });
  await prisma.category.delete({ where: { id } });
}

export async function listBrands() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function loadBrand(id: string): Promise<BrandFormValues | null> {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) {
    return null;
  }
  const seo = await prisma.seoMeta.findUnique({
    where: { entityType_entityId: { entityType: "BRAND", entityId: brand.id } },
  });
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    isActive: brand.isActive,
    metaTitle: seo?.metaTitle ?? "",
    metaDescription: seo?.metaDescription ?? "",
  };
}

export async function saveBrand(input: BrandFormValues): Promise<void> {
  const parsed = brandFormSchema.parse(input);
  const owner = await prisma.brand.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (owner && owner.id !== parsed.id) {
    throw new Error("That slug is already used");
  }
  const data = {
    name: parsed.name,
    slug: parsed.slug,
    description: parsed.description,
    isActive: parsed.isActive,
  };
  const saved = parsed.id
    ? await prisma.brand.update({ where: { id: parsed.id }, data })
    : await prisma.brand.create({ data });
  await saveSeo("BRAND", saved.id, parsed.metaTitle, parsed.metaDescription);
}

export async function deleteBrand(id: string): Promise<void> {
  const products = await prisma.product.count({ where: { brandId: id } });
  if (products > 0) {
    throw new Error("This brand still has products");
  }
  await prisma.seoMeta.deleteMany({ where: { entityType: "BRAND", entityId: id } });
  await prisma.brand.delete({ where: { id } });
}

export async function listUnits() {
  return prisma.unit.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function loadUnit(id: string): Promise<UnitFormValues | null> {
  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) {
    return null;
  }
  return { id: unit.id, name: unit.name, shortName: unit.shortName };
}

export async function saveUnit(input: UnitFormValues): Promise<void> {
  const parsed = unitFormSchema.parse(input);
  const data = { name: parsed.name, shortName: parsed.shortName };
  if (parsed.id) {
    await prisma.unit.update({ where: { id: parsed.id }, data });
    return;
  }
  await prisma.unit.create({ data });
}

export async function deleteUnit(id: string): Promise<void> {
  await prisma.unit.delete({ where: { id } });
}

export async function listLabels() {
  return prisma.label.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function loadLabel(id: string): Promise<LabelFormValues | null> {
  const label = await prisma.label.findUnique({ where: { id } });
  if (!label) {
    return null;
  }
  return { id: label.id, name: label.name, slug: label.slug, kind: label.kind };
}

export async function saveLabel(input: LabelFormValues): Promise<void> {
  const parsed = labelFormSchema.parse(input);
  const owner = await prisma.label.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (owner && owner.id !== parsed.id) {
    throw new Error("That slug is already used");
  }
  const data = { name: parsed.name, slug: parsed.slug, kind: parsed.kind };
  if (parsed.id) {
    await prisma.label.update({ where: { id: parsed.id }, data });
    return;
  }
  await prisma.label.create({ data });
}

export async function deleteLabel(id: string): Promise<void> {
  const used = await prisma.productLabel.count({ where: { labelId: id } });
  if (used > 0) {
    throw new Error("This label is still on products");
  }
  await prisma.label.delete({ where: { id } });
}

export async function listAttributes() {
  return prisma.attribute.findMany({
    orderBy: { name: "asc" },
    include: {
      values: { orderBy: { sortOrder: "asc" } },
      _count: { select: { products: true } },
    },
  });
}

export async function loadAttribute(id: string): Promise<AttributeFormValues | null> {
  const attribute = await prisma.attribute.findUnique({ where: { id } });
  if (!attribute) {
    return null;
  }
  return {
    id: attribute.id,
    name: attribute.name,
    slug: attribute.slug,
    style: attribute.style,
  };
}

export async function saveAttribute(input: AttributeFormValues): Promise<string> {
  const parsed = attributeFormSchema.parse(input);
  const owner = await prisma.attribute.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (owner && owner.id !== parsed.id) {
    throw new Error("That slug is already used");
  }
  const data = { name: parsed.name, slug: parsed.slug, style: parsed.style };
  const saved = parsed.id
    ? await prisma.attribute.update({ where: { id: parsed.id }, data })
    : await prisma.attribute.create({ data });
  return saved.id;
}

export async function deleteAttribute(id: string): Promise<void> {
  const [products, values] = await Promise.all([
    prisma.productAttribute.count({ where: { attributeId: id } }),
    prisma.variantAttributeValue.count({ where: { attributeId: id } }),
  ]);
  if (products > 0 || values > 0) {
    throw new Error("This attribute is still used by products");
  }
  await prisma.attribute.delete({ where: { id } });
}

export async function saveAttributeValue(input: AttributeValueFormValues): Promise<void> {
  const parsed = attributeValueSchema.parse(input);
  const data = {
    label: parsed.label,
    swatch: parsed.swatch || null,
    sortOrder: Number(parsed.sortOrder),
  };
  if (parsed.id) {
    await prisma.attributeValue.update({ where: { id: parsed.id }, data });
    return;
  }
  await prisma.attributeValue.create({
    data: { ...data, attributeId: parsed.attributeId },
  });
}

export async function deleteAttributeValue(id: string): Promise<void> {
  const used = await prisma.variantAttributeValue.count({
    where: { attributeValueId: id },
  });
  if (used > 0) {
    throw new Error("This value is still used by a variant");
  }
  await prisma.attributeValue.delete({ where: { id } });
}

export async function listTags(): Promise<{ tag: string; count: number }[]> {
  const products = await prisma.product.findMany({ select: { tags: true } });
  const counts = new Map<string, { tag: string; count: number }>();
  for (const product of products) {
    if (!Array.isArray(product.tags)) {
      continue;
    }
    for (const value of product.tags) {
      if (typeof value !== "string" || value.trim() === "") {
        continue;
      }
      const key = value.toLowerCase();
      const current = counts.get(key);
      if (current) {
        current.count += 1;
      } else {
        counts.set(key, { tag: value, count: 1 });
      }
    }
  }
  return [...counts.values()].sort((left, right) => left.tag.localeCompare(right.tag));
}

function replaceTag(value: Prisma.JsonValue, from: string, to: string | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const next: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const tag = item.toLowerCase() === from.toLowerCase() ? to : item;
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(tag);
  }
  return next;
}

export async function renameTag(from: string, to: string): Promise<number> {
  const parsed = tagRenameSchema.parse({ from, to });
  const products = await prisma.product.findMany({ select: { id: true, tags: true } });
  let changed = 0;
  for (const product of products) {
    const next = replaceTag(product.tags, parsed.from, parsed.to);
    const current = Array.isArray(product.tags)
      ? product.tags.filter((item): item is string => typeof item === "string")
      : [];
    if (current.join("|") === next.join("|")) {
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { tags: next } });
    changed += 1;
  }
  return changed;
}

export async function removeTag(tag: string): Promise<number> {
  const products = await prisma.product.findMany({ select: { id: true, tags: true } });
  let changed = 0;
  for (const product of products) {
    const next = replaceTag(product.tags, tag, null);
    const current = Array.isArray(product.tags)
      ? product.tags.filter((item): item is string => typeof item === "string")
      : [];
    if (current.length === next.length) {
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { tags: next } });
    changed += 1;
  }
  return changed;
}
