import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { saveSetting } from "@/server/settings/store";

export type AlertSettings = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  telegram: boolean;
  whatsapp: boolean;
  sound: boolean;
  lowStock: boolean;
  adminEmail: string;
  adminPhone: string;
  telegramChatId: string;
  whatsappPhone: string;
};

export const alertDefaults: AlertSettings = {
  inApp: true,
  email: true,
  sms: false,
  telegram: false,
  whatsapp: false,
  sound: true,
  lowStock: true,
  adminEmail: "admin@unibaazar.com",
  adminPhone: "01700000000",
  telegramChatId: "",
  whatsappPhone: "",
};

function flag(row: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof row[key] === "boolean" ? (row[key] as boolean) : fallback;
}

function text(row: Record<string, unknown>, key: string, fallback: string): string {
  return typeof row[key] === "string" ? (row[key] as string) : fallback;
}

export async function loadAlertSettings(): Promise<AlertSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "notifications.admin" } });
  const value =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? (row.value as Record<string, unknown>)
      : {};
  return {
    inApp: flag(value, "inApp", alertDefaults.inApp),
    email: flag(value, "email", alertDefaults.email),
    sms: flag(value, "sms", alertDefaults.sms),
    telegram: flag(value, "telegram", alertDefaults.telegram),
    whatsapp: flag(value, "whatsapp", alertDefaults.whatsapp),
    sound: flag(value, "sound", alertDefaults.sound),
    lowStock: flag(value, "lowStock", alertDefaults.lowStock),
    adminEmail: text(value, "adminEmail", alertDefaults.adminEmail),
    adminPhone: text(value, "adminPhone", alertDefaults.adminPhone),
    telegramChatId: text(value, "telegramChatId", alertDefaults.telegramChatId),
    whatsappPhone: text(value, "whatsappPhone", alertDefaults.whatsappPhone),
  };
}

export async function saveAlertSettings(
  input: AlertSettings & { telegramToken?: string },
): Promise<void> {
  const publicRow: AlertSettings = {
    inApp: input.inApp,
    email: input.email,
    sms: input.sms,
    telegram: input.telegram,
    whatsapp: input.whatsapp,
    sound: input.sound,
    lowStock: input.lowStock,
    adminEmail: input.adminEmail.trim(),
    adminPhone: input.adminPhone.trim(),
    telegramChatId: input.telegramChatId.trim(),
    whatsappPhone: input.whatsappPhone.trim(),
  };
  await saveSetting("notifications.admin", publicRow as unknown as Prisma.InputJsonValue);
  if (input.telegramToken && input.telegramToken.trim()) {
    await saveSetting("secret.telegram", input.telegramToken.trim(), true);
  }
}
