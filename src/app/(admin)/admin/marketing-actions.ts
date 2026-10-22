"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireCatalog } from "@/server/admin/access";
import { TAGS } from "@/server/cache/tags";
import {
  deleteBanner,
  deleteCoupon,
  deleteFlashSale,
  deleteRelation,
  deleteSlider,
  queueRecovery,
  saveBanner,
  saveCampaign,
  saveCoupon,
  saveFlashSale,
  saveRelation,
  saveSlider,
  saveSubscriber,
  sendCampaign,
  setCouponActive,
} from "@/server/admin/marketing";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  bannerSchema,
  campaignIdSchema,
  campaignSchema,
  cartIdSchema,
  couponSchema,
  flashSchema,
  idSchema,
  relationSchema,
  sliderSchema,
  subscriberSchema,
} from "@/lib/validation/admin-marketing";

function refresh(): void {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/flash");
  revalidatePath("/admin/marketing/banners");
  revalidatePath("/admin/marketing/audience");
  revalidatePath("/admin/marketing/relations");
}

// Flash sales, banners, sliders, and product relations all render on the
// storefront (home, flash-deals, offers, product pages) but `refresh()`
// above only ever touched /admin/* paths — these never revalidated the
// storefront at all before this phase.
function refreshStorefront(): void {
  revalidatePath("/");
  revalidatePath("/flash-deals");
  revalidatePath("/offers");
  revalidateTag(TAGS.home);
  revalidateTag(TAGS.products);
}

export async function couponAction(input: {
  id?: string;
  code: string;
  type: string;
  value: string;
  minSubtotal: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  categorySlug: string;
  productSlug: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = couponSchema.parse(input);
    const message = await saveCoupon(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteCouponAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteCoupon(session.userId, parsed.id);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function toggleCouponAction(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse({ id: input.id });
    const message = await setCouponActive(session.userId, parsed.id, input.isActive);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function flashAction(input: {
  id?: string;
  name: string;
  startsAt: string;
  endsAt: string;
  sku: string;
  salePrice: string;
  qtyLimit: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = flashSchema.parse(input);
    const message = await saveFlashSale(session.userId, parsed);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteFlashAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteFlashSale(session.userId, parsed.id);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function bannerAction(input: {
  id?: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
  placement: string;
  sortOrder: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = bannerSchema.parse(input);
    const message = await saveBanner(session.userId, parsed);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteBannerAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteBanner(session.userId, parsed.id);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function sliderAction(input: {
  id?: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
  sortOrder: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = sliderSchema.parse(input);
    const message = await saveSlider(session.userId, parsed);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteSliderAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteSlider(session.userId, parsed.id);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function subscriberAction(input: {
  email: string;
  phone: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = subscriberSchema.parse(input);
    const message = await saveSubscriber(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function campaignAction(input: {
  name: string;
  channel: string;
  subject: string;
  body: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = campaignSchema.parse(input);
    const message = await saveCampaign(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function sendCampaignAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = campaignIdSchema.parse(input);
    const message = await sendCampaign(session.userId, parsed.id);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function relationAction(input: {
  id?: string;
  productSlug: string;
  relatedSlug: string;
  kind: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = relationSchema.parse(input);
    const message = await saveRelation(session.userId, parsed);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteRelationAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteRelation(session.userId, parsed.id);
    refresh();
    refreshStorefront();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function recoveryAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = cartIdSchema.parse(input);
    const message = await queueRecovery(session.userId, parsed.id);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
