import {
  Prisma,
  type CampaignChannel,
  type CouponType,
  type RelationKind,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/server/security/audit";

function stamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function optionalDate(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid date");
  }
  return date;
}

function requiredDate(value: string): Date {
  const date = optionalDate(value);
  if (!date) {
    throw new Error("Enter a valid date");
  }
  return date;
}

function optionalInt(value: string, label: string): number | null {
  if (!value.trim()) {
    return null;
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`Enter a whole number for ${label}`);
  }
  return Number(value.trim());
}

function money(value: string): number {
  return Number(value);
}

export async function listCoupons() {
  const rows = await prisma.coupon.findMany({
    include: { category: true, product: true },
    orderBy: { code: "asc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value.toNumber(),
    minSubtotal: row.minSubtotal.toNumber(),
    usageLimit: row.usageLimit,
    usedCount: row.usedCount,
    perUserLimit: row.perUserLimit,
    category: row.category?.name ?? "",
    categorySlug: row.category?.slug ?? "",
    product: row.product?.name ?? "",
    productSlug: row.product?.slug ?? "",
    startsAt: row.startsAt ? stamp(row.startsAt) : "",
    endsAt: row.endsAt ? stamp(row.endsAt) : "",
    startsAtIso: row.startsAt ? row.startsAt.toISOString() : "",
    endsAtIso: row.endsAt ? row.endsAt.toISOString() : "",
    isActive: row.isActive,
  }));
}

export async function saveCoupon(
  actorId: string,
  input: {
    id?: string;
    code: string;
    type: CouponType;
    value: string;
    minSubtotal: string;
    usageLimit: string;
    perUserLimit: string;
    startsAt: string;
    endsAt: string;
    categorySlug: string;
    productSlug: string;
    isActive: boolean;
  },
): Promise<string> {
  const value = input.type === "FREE_SHIPPING" ? 0 : money(input.value);
  if (input.type !== "FREE_SHIPPING" && !/^\d+(\.\d{1,2})?$/.test(input.value)) {
    throw new Error("Enter a valid amount");
  }
  if (input.type === "PERCENT" && value > 100) {
    throw new Error("Percent cannot be more than 100");
  }
  const category = input.categorySlug
    ? await prisma.category.findUnique({ where: { slug: input.categorySlug } })
    : null;
  if (input.categorySlug && !category) {
    throw new Error("Category was not found");
  }
  const product = input.productSlug
    ? await prisma.product.findUnique({ where: { slug: input.productSlug } })
    : null;
  if (input.productSlug && !product) {
    throw new Error("Product was not found");
  }
  const code = input.code.toUpperCase();
  const owner = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
  if (owner && owner.id !== input.id) {
    throw new Error("That code is already used");
  }
  const data = {
    code,
    type: input.type,
    value,
    minSubtotal: money(input.minSubtotal),
    usageLimit: optionalInt(input.usageLimit, "usage limit"),
    perUserLimit: optionalInt(input.perUserLimit, "per-customer limit"),
    startsAt: optionalDate(input.startsAt),
    endsAt: optionalDate(input.endsAt),
    categoryId: category?.id ?? null,
    productId: product?.id ?? null,
    isActive: input.isActive,
  };
  const coupon = input.id
    ? await prisma.coupon.update({ where: { id: input.id }, data })
    : await prisma.coupon.create({ data });
  await recordAudit({
    actorId,
    action: "marketing.coupon",
    entityType: "Coupon",
    entityId: coupon.id,
  });
  return `${code} saved.`;
}

export async function deleteCoupon(actorId: string, id: string): Promise<string> {
  await prisma.coupon.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "marketing.coupon.delete",
    entityType: "Coupon",
    entityId: id,
  });
  return "Coupon removed.";
}

export async function setCouponActive(
  actorId: string,
  id: string,
  isActive: boolean,
): Promise<string> {
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  await recordAudit({
    actorId,
    action: "marketing.coupon.toggle",
    entityType: "Coupon",
    entityId: id,
  });
  return isActive ? "Coupon activated." : "Coupon deactivated.";
}

export async function listFlashSales() {
  const rows = await prisma.flashSale.findMany({
    include: { items: { include: { variant: true } } },
    orderBy: { startsAt: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startsAt: stamp(row.startsAt),
    endsAt: stamp(row.endsAt),
    startsAtIso: row.startsAt.toISOString(),
    endsAtIso: row.endsAt.toISOString(),
    isActive: row.isActive,
    items: row.items.map((item) => ({
      sku: item.variant.sku,
      salePrice: item.salePrice.toNumber(),
      qtyLimit: item.qtyLimit,
    })),
  }));
}

export async function saveFlashSale(
  actorId: string,
  input: {
    id?: string;
    name: string;
    startsAt: string;
    endsAt: string;
    sku: string;
    salePrice: string;
    qtyLimit: string;
    isActive: boolean;
  },
): Promise<string> {
  const startsAt = requiredDate(input.startsAt);
  const endsAt = requiredDate(input.endsAt);
  if (endsAt <= startsAt) {
    throw new Error("The end must be after the start");
  }
  const variant = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (!variant) {
    throw new Error(`SKU ${input.sku} was not found`);
  }
  const itemData = {
    variantId: variant.id,
    salePrice: money(input.salePrice),
    qtyLimit: optionalInt(input.qtyLimit, "quantity limit"),
  };
  const sale = input.id
    ? await prisma.flashSale.update({
        where: { id: input.id },
        data: {
          name: input.name,
          startsAt,
          endsAt,
          isActive: input.isActive,
          items: { deleteMany: {}, create: itemData },
        },
      })
    : await prisma.flashSale.create({
        data: {
          name: input.name,
          startsAt,
          endsAt,
          isActive: input.isActive,
          items: { create: itemData },
        },
      });
  await recordAudit({
    actorId,
    action: "marketing.flash",
    entityType: "FlashSale",
    entityId: sale.id,
  });
  return `${input.name} saved.`;
}

export async function deleteFlashSale(actorId: string, id: string): Promise<string> {
  await prisma.flashSale.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "marketing.flash.delete",
    entityType: "FlashSale",
    entityId: id,
  });
  return "Flash sale removed.";
}

export async function listBanners() {
  const rows = await prisma.banner.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    href: row.href,
    imageUrl: row.imageUrl ?? "",
    placement: row.placement,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function saveBanner(
  actorId: string,
  input: {
    id?: string;
    title: string;
    subtitle: string;
    href: string;
    imageUrl?: string;
    placement: string;
    sortOrder: string;
    isActive: boolean;
  },
): Promise<string> {
  const data = {
    title: input.title,
    subtitle: input.subtitle || null,
    href: input.href,
    imageUrl: input.imageUrl || null,
    placement: input.placement,
    sortOrder: optionalInt(input.sortOrder, "sort") ?? 0,
    isActive: input.isActive,
  };
  const banner = input.id
    ? await prisma.banner.update({ where: { id: input.id }, data })
    : await prisma.banner.create({ data });
  await recordAudit({
    actorId,
    action: "marketing.banner",
    entityType: "Banner",
    entityId: banner.id,
  });
  return "Banner saved.";
}

export async function deleteBanner(actorId: string, id: string): Promise<string> {
  await prisma.banner.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "marketing.banner.delete",
    entityType: "Banner",
    entityId: id,
  });
  return "Banner removed.";
}

export async function listSliders() {
  const rows = await prisma.slider.findMany({ orderBy: { sortOrder: "asc" }, take: 20 });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    href: row.href,
    imageUrl: row.imageUrl ?? "",
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function saveSlider(
  actorId: string,
  input: {
    id?: string;
    title: string;
    subtitle: string;
    href: string;
    imageUrl?: string;
    sortOrder: string;
    isActive: boolean;
  },
): Promise<string> {
  const data = {
    title: input.title,
    subtitle: input.subtitle || null,
    href: input.href,
    imageUrl: input.imageUrl || null,
    sortOrder: optionalInt(input.sortOrder, "sort") ?? 0,
    isActive: input.isActive,
  };
  const slider = input.id
    ? await prisma.slider.update({ where: { id: input.id }, data })
    : await prisma.slider.create({ data });
  await recordAudit({
    actorId,
    action: "marketing.slider",
    entityType: "Slider",
    entityId: slider.id,
  });
  return "Slide saved.";
}

export async function deleteSlider(actorId: string, id: string): Promise<string> {
  await prisma.slider.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "marketing.slider.delete",
    entityType: "Slider",
    entityId: id,
  });
  return "Slide removed.";
}

export async function listSubscribers() {
  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    phone: row.phone ?? "",
    at: stamp(row.createdAt),
  }));
}

export async function saveSubscriber(
  actorId: string,
  input: { email: string; phone: string },
): Promise<string> {
  const subscriber = await prisma.subscriber.create({
    data: { email: input.email.toLowerCase(), phone: input.phone || null },
  });
  await recordAudit({
    actorId,
    action: "marketing.subscriber",
    entityType: "Subscriber",
    entityId: subscriber.id,
  });
  return "Subscriber saved.";
}

export async function listCampaigns() {
  const rows = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject ?? "",
    body: row.body,
    status: row.status,
    sentAt: row.sentAt ? stamp(row.sentAt) : "",
  }));
}

export async function saveCampaign(
  actorId: string,
  input: { name: string; channel: CampaignChannel; subject: string; body: string },
): Promise<string> {
  if (input.channel === "EMAIL" && !input.subject.trim()) {
    throw new Error("Enter an email subject");
  }
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      channel: input.channel,
      subject: input.subject || null,
      body: input.body,
    },
  });
  await recordAudit({
    actorId,
    action: "marketing.campaign",
    entityType: "Campaign",
    entityId: campaign.id,
  });
  return `${input.name} saved as a draft.`;
}

export async function sendCampaign(actorId: string, id: string): Promise<string> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  if (campaign.status === "SENT") {
    throw new Error("This campaign was already sent");
  }
  const people = await prisma.subscriber.findMany({ take: 200 });
  if (campaign.channel === "SMS") {
    const targets = people.filter((person) => person.phone);
    if (targets.length === 0) {
      throw new Error("No subscriber has a phone number");
    }
    for (const person of targets) {
      await prisma.smsLog.create({
        data: {
          to: person.phone ?? "",
          body: campaign.body,
          provider: "not-configured",
          status: "queued",
          response: { campaignId: campaign.id } satisfies Prisma.InputJsonValue,
        },
      });
    }
  } else {
    if (people.length === 0) {
      throw new Error("Add a subscriber before sending");
    }
    for (const person of people) {
      await prisma.emailLog.create({
        data: {
          to: person.email,
          subject: campaign.subject || campaign.name,
          body: campaign.body,
          status: "queued",
        },
      });
    }
  }
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date() },
  });
  await recordAudit({
    actorId,
    action: "marketing.send",
    entityType: "Campaign",
    entityId: campaign.id,
  });
  return `${campaign.name} queued.`;
}

export async function listRelations() {
  const rows = await prisma.productRelation.findMany({
    include: { product: true, related: true },
    orderBy: { kind: "asc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    product: row.product.name,
    productSlug: row.product.slug,
    related: row.related.name,
    relatedSlug: row.related.slug,
    kind: row.kind,
  }));
}

export async function saveRelation(
  actorId: string,
  input: { id?: string; productSlug: string; relatedSlug: string; kind: RelationKind },
): Promise<string> {
  const product = await prisma.product.findUnique({ where: { slug: input.productSlug } });
  const related = await prisma.product.findUnique({ where: { slug: input.relatedSlug } });
  if (!product || !related) {
    throw new Error("Both products must already exist");
  }
  if (product.id === related.id) {
    throw new Error("Choose a different related product");
  }
  const data = { productId: product.id, relatedId: related.id, kind: input.kind };
  const relation = input.id
    ? await prisma.productRelation.update({ where: { id: input.id }, data })
    : await prisma.productRelation.create({ data });
  await recordAudit({
    actorId,
    action: "marketing.relation",
    entityType: "ProductRelation",
    entityId: relation.id,
  });
  return "Product rule saved.";
}

export async function deleteRelation(actorId: string, id: string): Promise<string> {
  await prisma.productRelation.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "marketing.relation.delete",
    entityType: "ProductRelation",
    entityId: id,
  });
  return "Product rule removed.";
}

export async function listRecovery() {
  const carts = await prisma.cart.findMany({
    where: { status: "ACTIVE", items: { some: {} } },
    include: { customer: true, user: true, items: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return carts.map((cart) => ({
    id: cart.id,
    who: cart.customer?.name || cart.user?.name || "Guest",
    phone: cart.customer?.phone || cart.user?.phone || "",
    email: cart.customer?.email || cart.user?.email || "",
    items: cart.items.length,
    updatedAt: stamp(cart.updatedAt),
  }));
}

export async function queueRecovery(actorId: string, id: string): Promise<string> {
  const cart = await prisma.cart.findUnique({
    where: { id },
    include: { customer: true, user: true },
  });
  if (!cart || cart.status !== "ACTIVE") {
    throw new Error("Cart not found");
  }
  const phone = cart.customer?.phone || cart.user?.phone || "";
  const email = cart.customer?.email || cart.user?.email || "";
  if (!phone && !email) {
    throw new Error("This cart has no phone or email");
  }
  const body =
    "You left items in your UniBaazar cart. Complete the order when you are ready.";
  if (phone) {
    await prisma.smsLog.create({
      data: {
        to: phone,
        body,
        provider: "not-configured",
        status: "queued",
        response: { cartId: cart.id },
      },
    });
  }
  if (email) {
    await prisma.emailLog.create({
      data: {
        to: email,
        subject: "Your UniBaazar cart is waiting",
        body,
        status: "queued",
      },
    });
  }
  await recordAudit({
    actorId,
    action: "marketing.recovery",
    entityType: "Cart",
    entityId: cart.id,
  });
  return "Reminder queued.";
}
