"use server";

import { revalidatePath } from "next/cache";
import { requireCatalog } from "@/server/admin/access";
import {
  answerQuestion,
  deleteQuestion,
  importReviewsCsv,
  moderateReview,
} from "@/server/admin/moderation";
import {
  bulkAdminProducts,
  deleteAdminProduct,
  duplicateAdminProduct,
  importProductsCsv,
  quickEditAdminProduct,
  saveAdminProduct,
} from "@/server/admin/products";
import { actionError, type ActionResult } from "@/server/admin/result";
import { recordAudit } from "@/server/security/audit";
import {
  deleteAttribute,
  deleteAttributeValue,
  deleteBrand,
  deleteCategory,
  deleteLabel,
  deleteUnit,
  removeTag,
  renameTag,
  saveAttribute,
  saveAttributeValue,
  saveBrand,
  saveCategory,
  saveLabel,
  saveUnit,
} from "@/server/admin/taxonomy";
import { storeCatalogImage } from "@/server/admin/uploads";
import type {
  AttributeFormValues,
  AttributeValueFormValues,
  BrandFormValues,
  CategoryFormValues,
  LabelFormValues,
  ProductFormValues,
  UnitFormValues,
} from "@/lib/validation/admin-catalog";

function refreshCatalog(slug?: string): void {
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/attributes");
  revalidatePath("/admin/units");
  revalidatePath("/admin/labels");
  revalidatePath("/admin/tags");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/questions");
  if (slug) {
    revalidatePath(`/product/${slug}`);
  }
}

export async function saveProductAction(input: ProductFormValues): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const saved = await saveAdminProduct(input);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.save",
      entityType: "product",
      entityId: saved.id,
    });
    refreshCatalog(input.slug);
    return { ok: true, id: saved.id, message: saved.note.trim() };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    await deleteAdminProduct(id);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.delete",
      entityType: "product",
      entityId: id,
    });
    refreshCatalog();
    return { ok: true, message: "Product deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function duplicateProductAction(id: string): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const copyId = await duplicateAdminProduct(id);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.duplicate",
      entityType: "product",
      entityId: copyId,
    });
    refreshCatalog();
    return { ok: true, id: copyId, message: "Draft copy created." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function quickEditAction(input: {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  price: string;
  stock: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    await quickEditAdminProduct(input);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.quick-edit",
      entityType: "product",
      entityId: input.id,
    });
    refreshCatalog();
    return { ok: true, message: "Product updated." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function bulkProductsAction(input: unknown): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const message = await bulkAdminProducts(input);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.bulk",
      entityType: "product",
    });
    refreshCatalog();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function importProductsAction(csv: string): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const message = await importProductsCsv(csv);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.product.import",
      entityType: "product",
    });
    refreshCatalog();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function uploadCatalogImageAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireCatalog();
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, message: "Choose an image" };
    }
    const url = await storeCatalogImage(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    return { ok: true, url, message: "Image uploaded." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveCategoryAction(
  input: CategoryFormValues,
): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    await saveCategory(input);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.category.save",
      entityType: "category",
    });
    refreshCatalog();
    return { ok: true, message: "Category saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteCategory(id);
    refreshCatalog();
    return { ok: true, message: "Category deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveBrandAction(input: BrandFormValues): Promise<ActionResult> {
  await requireCatalog();
  try {
    await saveBrand(input);
    refreshCatalog();
    return { ok: true, message: "Brand saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteBrand(id);
    refreshCatalog();
    return { ok: true, message: "Brand deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveUnitAction(input: UnitFormValues): Promise<ActionResult> {
  await requireCatalog();
  try {
    await saveUnit(input);
    refreshCatalog();
    return { ok: true, message: "Unit saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteUnitAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteUnit(id);
    refreshCatalog();
    return { ok: true, message: "Unit deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveLabelAction(input: LabelFormValues): Promise<ActionResult> {
  await requireCatalog();
  try {
    await saveLabel(input);
    refreshCatalog();
    return { ok: true, message: "Label saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteLabelAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteLabel(id);
    refreshCatalog();
    return { ok: true, message: "Label deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveAttributeAction(
  input: AttributeFormValues,
): Promise<ActionResult> {
  await requireCatalog();
  try {
    const id = await saveAttribute(input);
    refreshCatalog();
    return { ok: true, id, message: "Attribute saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteAttributeAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteAttribute(id);
    refreshCatalog();
    return { ok: true, message: "Attribute deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveAttributeValueAction(
  input: AttributeValueFormValues,
): Promise<ActionResult> {
  await requireCatalog();
  try {
    await saveAttributeValue(input);
    refreshCatalog();
    return { ok: true, message: "Value saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteAttributeValueAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteAttributeValue(id);
    refreshCatalog();
    return { ok: true, message: "Value deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function renameTagAction(from: string, to: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    const changed = await renameTag(from, to);
    refreshCatalog();
    return { ok: true, message: `Updated ${changed} products.` };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function removeTagAction(tag: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    const changed = await removeTag(tag);
    refreshCatalog();
    return { ok: true, message: `Removed the tag from ${changed} products.` };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function moderateReviewAction(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    await moderateReview(id, status);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.review.moderate",
      entityType: "review",
      entityId: id,
    });
    refreshCatalog();
    return { ok: true, message: "Review updated." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function importReviewsAction(csv: string): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const message = await importReviewsCsv(csv);
    await recordAudit({
      actorId: session.userId,
      action: "catalog.review.import",
      entityType: "review",
    });
    refreshCatalog();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function answerQuestionAction(
  id: string,
  answer: string,
): Promise<ActionResult> {
  await requireCatalog();
  try {
    await answerQuestion(id, answer);
    refreshCatalog();
    return { ok: true, message: "Answer saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  await requireCatalog();
  try {
    await deleteQuestion(id);
    refreshCatalog();
    return { ok: true, message: "Question deleted." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
