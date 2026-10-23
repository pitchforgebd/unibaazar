"use server";

import { revalidatePath } from "next/cache";
import { requireOrders } from "@/server/admin/access";
import {
  bookCourier,
  createManualOrder,
  decideReturn,
  refundOrderPayment,
  saveOrderNotes,
  setOrderStatus,
  setPaymentStatus,
  syncCourier,
  updateOrderItems,
} from "@/server/admin/orders-admin";
import { saveNotifyTemplates } from "@/server/admin/notify";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  bulkIdsSchema,
  bulkStatusSchema,
  itemsSchema,
  manualOrderSchema,
  notesSchema,
  paymentSchema,
  refundSchema,
  returnSchema,
  statusSchema,
  templateSchema,
} from "@/lib/validation/admin-orders";

function refreshOrders(orderId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/abandoned");
  revalidatePath("/admin/orders/returns");
  revalidatePath("/admin/orders/templates");
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
  }
}

export async function setStatusAction(input: {
  orderId: string;
  status: string;
  note: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = statusSchema.parse(input);
    const message = await setOrderStatus(
      session.userId,
      parsed.orderId,
      parsed.status,
      parsed.note,
    );
    refreshOrders(parsed.orderId);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function bulkStatusAction(input: {
  ids: string[];
  status: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = bulkStatusSchema.parse(input);
    const messages: string[] = [];
    for (const id of parsed.ids) {
      messages.push(
        await setOrderStatus(session.userId, id, parsed.status, "Bulk status update"),
      );
      refreshOrders(id);
    }
    return { ok: true, message: messages[messages.length - 1] ?? "Statuses saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function notesAction(input: {
  orderId: string;
  customerNote: string;
  internalNote: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = notesSchema.parse(input);
    await saveOrderNotes(
      session.userId,
      parsed.orderId,
      parsed.customerNote,
      parsed.internalNote,
    );
    refreshOrders(parsed.orderId);
    return { ok: true, message: "Notes saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function itemsAction(input: {
  orderId: string;
  discount: string;
  deliveryCharge: string;
  items: { id: string; qty: string; unitPrice: string }[];
  addSku: string;
  addQty: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = itemsSchema.parse(input);
    await updateOrderItems(session.userId, parsed);
    refreshOrders(parsed.orderId);
    return { ok: true, message: "Items saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function paymentAction(input: {
  orderId: string;
  status: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = paymentSchema.parse(input);
    const message = await setPaymentStatus(session.userId, parsed.orderId, parsed.status);
    refreshOrders(parsed.orderId);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function refundAction(input: {
  orderId: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = refundSchema.parse(input);
    const message = await refundOrderPayment(
      session.userId,
      parsed.orderId,
      parsed.amount,
      parsed.note?.trim() || null,
    );
    refreshOrders(parsed.orderId);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function manualOrderAction(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  paymentMethod: string;
  customerNote: string;
  source: string;
  lines: { sku: string; qty: string }[];
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = manualOrderSchema.parse(input);
    const created = await createManualOrder(session.userId, parsed);
    refreshOrders(created.id);
    return { ok: true, id: created.id, message: `Order ${created.number} created.` };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function bookCourierAction(orderId: string): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const message = await bookCourier(session.userId, orderId);
    refreshOrders(orderId);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function bulkBookAction(input: { ids: string[] }): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = bulkIdsSchema.parse(input);
    const messages: string[] = [];
    for (const id of parsed.ids) {
      messages.push(await bookCourier(session.userId, id));
      refreshOrders(id);
    }
    return { ok: true, message: messages.join(" ") };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function syncCourierAction(orderId: string): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const message = await syncCourier(session.userId, orderId);
    refreshOrders(orderId);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function returnAction(input: {
  id: string;
  status: string;
  refundAmount: string;
}): Promise<ActionResult> {
  const session = await requireOrders();
  try {
    const parsed = returnSchema.parse(input);
    const message = await decideReturn(
      session.userId,
      parsed.id,
      parsed.status,
      parsed.refundAmount,
    );
    refreshOrders();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function templatesAction(input: {
  sms: string;
  emailSubject: string;
  emailBody: string;
}): Promise<ActionResult> {
  await requireOrders();
  try {
    const parsed = templateSchema.parse(input);
    await saveNotifyTemplates(parsed);
    refreshOrders();
    return { ok: true, message: "Templates saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
