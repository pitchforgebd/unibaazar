"use server";

import { revalidatePath } from "next/cache";
import {
  alertsSchema,
  checkoutSchema,
  courierWebhookSchema,
  generalSchema,
  integrationSchema,
  invoiceSchema,
  restoreSchema,
  socialSchema,
  systemSchema,
  themeSchema,
} from "@/lib/validation/admin-settings";
import { requireSettings } from "@/server/admin/access";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  exportDatabase,
  noteGatewayTest,
  queueEmailTest,
  queueSmsTest,
  restoreDatabase,
  saveAlerts,
  saveCheckout,
  saveGeneral,
  saveIntegrations,
  saveInvoice,
  saveSocial,
  saveSystem,
  saveTheme,
} from "@/server/admin/settings";
import {
  resetCourierWebhookHealth,
  saveCourierWebhookToken,
} from "@/server/courier/webhook";

function refresh(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}

export async function generalAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = generalSchema.parse(input);
    await saveGeneral(session.userId, parsed);
    refresh();
    return { ok: true, message: "General settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function themeAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = themeSchema.parse(input);
    await saveTheme(session.userId, parsed);
    refresh();
    return { ok: true, message: "Theme saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function checkoutAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = checkoutSchema.parse(input);
    await saveCheckout(session.userId, parsed);
    refresh();
    return { ok: true, message: "Checkout settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function integrationAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = integrationSchema.parse(input);
    await saveIntegrations(session.userId, parsed);
    refresh();
    return { ok: true, message: "Gateway settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function invoiceAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = invoiceSchema.parse(input);
    await saveInvoice(session.userId, parsed);
    refresh();
    return { ok: true, message: "Invoice settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function socialAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = socialSchema.parse(input);
    await saveSocial(session.userId, parsed);
    refresh();
    return { ok: true, message: "Social links saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function systemAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = systemSchema.parse(input);
    await saveSystem(session.userId, parsed);
    refresh();
    return { ok: true, message: "Site settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function alertsAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = alertsSchema.parse(input);
    await saveAlerts(session.userId, parsed);
    refresh();
    return { ok: true, message: "Notification settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function smsTestAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    return { ok: true, message: await queueSmsTest(session.userId) };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function emailTestAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    return { ok: true, message: await queueEmailTest(session.userId) };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function paymentTestAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    return { ok: true, message: await noteGatewayTest(session.userId, "payment") };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function courierTestAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    return { ok: true, message: await noteGatewayTest(session.userId, "courier") };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function courierWebhookAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = courierWebhookSchema.parse(input);
    await saveCourierWebhookToken(session.userId, parsed.token);
    refresh();
    return { ok: true, message: "Webhook saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function resetCourierWebhookAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const message = await resetCourierWebhookHealth(session.userId);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function backupAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const message = await exportDatabase(session.userId);
    revalidatePath("/admin/settings/system");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function restoreAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = restoreSchema.parse(input);
    const message = await restoreDatabase(session.userId, parsed.file);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function cacheAction(): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    refresh();
    await recordCache(session.userId);
    return { ok: true, message: "Store cache cleared." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

async function recordCache(actorId: string): Promise<void> {
  const { recordAudit } = await import("@/server/security/audit");
  await recordAudit({
    actorId,
    action: "settings.cache",
    entityType: "Setting",
    entityId: "cache",
  });
}
