"use server";

import { revalidatePath } from "next/cache";
import { requireCatalog } from "@/server/admin/access";
import {
  adjustStock,
  assignBarcodes,
  createPurchase,
  receivePurchase,
  saveSupplier,
  saveWarehouse,
} from "@/server/admin/inventory";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  adjustSchema,
  purchaseIdSchema,
  purchaseSchema,
  supplierSchema,
  variantIdsSchema,
  warehouseSchema,
} from "@/lib/validation/admin-inventory";

function refreshInventory(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/ledger");
  revalidatePath("/admin/inventory/suppliers");
  revalidatePath("/admin/inventory/purchases");
}

export async function adjustStockAction(input: {
  sku: string;
  change: string;
  reason: string;
  note: string;
  warehouseId: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = adjustSchema.parse(input);
    const message = await adjustStock(session.userId, parsed);
    refreshInventory();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function warehouseAction(input: {
  code: string;
  name: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = warehouseSchema.parse(input);
    await saveWarehouse(session.userId, parsed.code, parsed.name);
    refreshInventory();
    return { ok: true, message: "Warehouse saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function barcodesAction(input: { ids: string[] }): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = variantIdsSchema.parse(input);
    const assigned = await assignBarcodes(session.userId, parsed.ids);
    refreshInventory();
    return {
      ok: true,
      message:
        assigned === 0
          ? "Those variants already have barcodes."
          : assigned === 1
            ? "1 barcode assigned."
            : `${assigned} barcodes assigned.`,
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function supplierAction(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = supplierSchema.parse(input);
    await saveSupplier(session.userId, parsed);
    refreshInventory();
    return { ok: true, message: "Supplier saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function purchaseAction(input: {
  supplierId: string;
  notes: string;
  lines: { sku: string; qty: string; cost: string }[];
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = purchaseSchema.parse(input);
    const created = await createPurchase(session.userId, parsed);
    refreshInventory();
    revalidatePath(`/admin/inventory/purchases/${created.id}`);
    return { ok: true, id: created.id, message: `${created.number} created.` };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function receivePurchaseAction(input: {
  id: string;
}): Promise<ActionResult> {
  const session = await requireCatalog();
  try {
    const parsed = purchaseIdSchema.parse(input);
    const message = await receivePurchase(session.userId, parsed.id);
    refreshInventory();
    revalidatePath(`/admin/inventory/purchases/${parsed.id}`);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
