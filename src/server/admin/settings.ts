import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { sendSms } from "@/lib/sms/send";
import { recordAudit } from "@/server/security/audit";
import {
  loadIntegrations,
  saveSetting,
  type CheckoutSettings,
  type GeneralSettings,
  type IntegrationSettings,
  type InvoiceSettings,
  type SocialSettings,
  type SystemSettings,
  type ThemeSettings,
} from "@/server/settings/store";

function databaseUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is missing");
  }
  return new URL(raw);
}

function mysqlBin(name: "mysqldump" | "mysql"): string {
  const override =
    name === "mysqldump" ? process.env.MYSQLDUMP_PATH : process.env.MYSQL_PATH;
  if (override) {
    return override;
  }
  const laragon = `C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\${name}.exe`;
  if (existsSync(laragon)) {
    return laragon;
  }
  return name;
}

function backupDir(): string {
  const folder = join(process.cwd(), "backups");
  mkdirSync(folder, { recursive: true });
  return folder;
}

export async function saveGeneral(
  actorId: string,
  input: GeneralSettings,
): Promise<void> {
  await saveSetting("general", input as unknown as Prisma.InputJsonValue);
  await recordAudit({
    actorId,
    action: "settings.general",
    entityType: "Setting",
    entityId: "general",
  });
}

export async function saveTheme(actorId: string, input: ThemeSettings): Promise<void> {
  await saveSetting("theme", input as unknown as Prisma.InputJsonValue);
  await recordAudit({
    actorId,
    action: "settings.theme",
    entityType: "Setting",
    entityId: "theme",
  });
}

export async function saveCheckout(
  actorId: string,
  input: CheckoutSettings,
): Promise<void> {
  await saveSetting("checkout", input as unknown as Prisma.InputJsonValue);
  await saveSetting("delivery.inside", input.inside);
  await saveSetting("delivery.outside", input.outside);
  await saveSetting("delivery.freeFrom", input.freeFrom);
  await recordAudit({
    actorId,
    action: "settings.checkout",
    entityType: "Setting",
    entityId: "checkout",
  });
}

async function keepSecret(key: string, value: string): Promise<void> {
  const next = value.trim();
  if (!next) {
    return;
  }
  await saveSetting(key, next, true);
}

export async function saveIntegrations(
  actorId: string,
  input: IntegrationSettings & {
    bkashSecret: string;
    nagadSecret: string;
    sslcommerzStorePass: string;
    smsSecret: string;
    emailSecret: string;
    courierSecret: string;
  },
): Promise<void> {
  const publicRow: IntegrationSettings = {
    bkashEnabled: input.bkashEnabled,
    bkashMerchant: input.bkashMerchant,
    nagadEnabled: input.nagadEnabled,
    nagadMerchant: input.nagadMerchant,
    sslcommerzEnabled: input.sslcommerzEnabled,
    sslcommerzStoreId: input.sslcommerzStoreId,
    sslcommerzSandbox: input.sslcommerzSandbox,
    smsSender: input.smsSender,
    emailHost: input.emailHost,
    emailPort: input.emailPort,
    emailUser: input.emailUser,
    emailFrom: input.emailFrom,
    courierUser: input.courierUser,
  };
  await saveSetting("integrations", publicRow as unknown as Prisma.InputJsonValue);
  await keepSecret("secret.bkash", input.bkashSecret);
  await keepSecret("secret.nagad", input.nagadSecret);
  await keepSecret("secret.sslcommerz", input.sslcommerzStorePass);
  await keepSecret("secret.sms", input.smsSecret);
  await keepSecret("secret.email", input.emailSecret);
  await keepSecret("secret.courier", input.courierSecret);
  await recordAudit({
    actorId,
    action: "settings.integrations",
    entityType: "Setting",
    entityId: "integrations",
  });
}

export async function saveInvoice(
  actorId: string,
  input: InvoiceSettings,
): Promise<void> {
  await saveSetting("invoice", input as unknown as Prisma.InputJsonValue);
  await recordAudit({
    actorId,
    action: "settings.invoice",
    entityType: "Setting",
    entityId: "invoice",
  });
}

export async function saveSocial(
  actorId: string,
  input: SocialSettings & {
    googleClientSecret: string;
    facebookAppSecret: string;
    facebookPageToken: string;
  },
): Promise<void> {
  const { googleClientSecret, facebookAppSecret, facebookPageToken, ...publicRow } =
    input;
  await saveSetting("social", publicRow as unknown as Prisma.InputJsonValue);
  await keepSecret("secret.google", googleClientSecret);
  await keepSecret("secret.facebook", facebookAppSecret);
  await keepSecret("secret.facebookPage", facebookPageToken);
  await recordAudit({
    actorId,
    action: "settings.social",
    entityType: "Setting",
    entityId: "social",
  });
}

export async function saveAlerts(
  actorId: string,
  input: {
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
    telegramToken?: string;
  },
): Promise<void> {
  const { saveAlertSettings } = await import("@/server/settings/alerts");
  await saveAlertSettings(input);
  await recordAudit({
    actorId,
    action: "settings.notifications",
    entityType: "Setting",
    entityId: "notifications.admin",
  });
}

export async function saveSystem(actorId: string, input: SystemSettings): Promise<void> {
  await saveSetting("system", input as unknown as Prisma.InputJsonValue);
  await recordAudit({
    actorId,
    action: "settings.system",
    entityType: "Setting",
    entityId: "system",
  });
}

export async function queueSmsTest(actorId: string): Promise<string> {
  const settings = await loadIntegrations();
  if (!settings.smsSender) {
    throw new Error("Save an SMS sender name first");
  }
  await sendSms("01700000000", "UniBaazar settings test");
  const balanceNote = await smsBalanceNote();
  await recordAudit({
    actorId,
    action: "settings.sms.test",
    entityType: "Setting",
    entityId: "integrations",
  });
  return `Test SMS sent to 01700000000.${balanceNote}`;
}

async function smsBalanceNote(): Promise<string> {
  const { bulkSmsBdProvider } = await import("@/lib/sms/bulksmsbd");
  try {
    const { amount } = await bulkSmsBdProvider.balance!();
    return ` Balance: ৳${amount.toFixed(2)}.`;
  } catch {
    return "";
  }
}

export async function queueEmailTest(actorId: string): Promise<string> {
  const settings = await loadIntegrations();
  if (!settings.emailFrom) {
    throw new Error("Save a from address first");
  }
  await sendEmail(
    settings.emailFrom,
    "UniBaazar settings test",
    "This test was sent from website settings.",
  );
  await recordAudit({
    actorId,
    action: "settings.email.test",
    entityType: "Setting",
    entityId: "integrations",
  });
  return `Test email sent to ${settings.emailFrom}`;
}

export async function noteGatewayTest(
  actorId: string,
  kind: "payment" | "courier",
): Promise<string> {
  const settings = await loadIntegrations();
  if (kind === "payment") {
    // A genuine connection attempt only for SSLCommerz — it's the one
    // provider actually implemented (src/lib/payment/sslcommerz.ts).
    // bKash/Nagad settings here are merchant-info-only today (they route
    // through the SSLCommerz aggregator, see ADR 0018), so there's no
    // separate gateway to test for them yet.
    if (settings.sslcommerzEnabled) {
      const message = await testSslcommerzConnection();
      await recordAudit({
        actorId,
        action: "settings.payment.test",
        entityType: "Setting",
        entityId: "integrations",
        metadata: { provider: "sslcommerz", result: message },
      });
      return message;
    }
    if (!settings.bkashEnabled && !settings.nagadEnabled) {
      throw new Error("Turn on SSLCommerz, bKash, or Nagad and save first");
    }
    await recordAudit({
      actorId,
      action: "settings.payment.test",
      entityType: "Setting",
      entityId: "integrations",
      metadata: { provider: "bkash/nagad", result: "not independently testable" },
    });
    return "bKash/Nagad route through SSLCommerz today — enable and configure SSLCommerz above to test a real connection.";
  }
  if (!settings.courierUser) {
    throw new Error("Save a Steadfast API key first");
  }
  const message = await testSteadfastConnection();
  await recordAudit({
    actorId,
    action: "settings.courier.test",
    entityType: "Setting",
    entityId: "integrations",
    metadata: { provider: "steadfast", result: message },
  });
  return message;
}

async function testSteadfastConnection(): Promise<string> {
  const { steadfastProvider } = await import("@/lib/courier/steadfast");
  try {
    const { amount } = await steadfastProvider.balance!();
    return `Connected — Steadfast balance is ৳${amount.toFixed(2)}.`;
  } catch (error) {
    return `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function testSslcommerzConnection(): Promise<string> {
  const { sslcommerzProvider } = await import("@/lib/payment/sslcommerz");
  try {
    const result = await sslcommerzProvider.initiate({
      orderNumber: `TEST-CONN-${Date.now()}`,
      amount: 10,
      customerName: "Connection Test",
      customerPhone: "01700000000",
      customerEmail: null,
      customerAddress: "Admin settings test",
    });
    if (result.kind === "redirect") {
      return "Connected — SSLCommerz accepted a test session. No charge was made.";
    }
    return `Not connected: ${result.message}`;
  } catch (error) {
    return `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export function listBackups(): string[] {
  const folder = backupDir();
  return readdirSync(folder)
    .filter((name) => /^unibaazar-[A-Za-z0-9._-]+\.sql$/.test(name))
    .sort()
    .reverse();
}

export async function exportDatabase(actorId: string): Promise<string> {
  const db = databaseUrl();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(backupDir(), `unibaazar-${stamp}.sql`);
  const result = spawnSync(
    mysqlBin("mysqldump"),
    [
      "-h",
      db.hostname,
      "-P",
      db.port || "3306",
      "-u",
      decodeURIComponent(db.username),
      "--single-transaction",
      "--result-file",
      file,
      decodeURIComponent(db.pathname.replace(/^\//, "")),
    ],
    {
      env: { ...process.env, MYSQL_PWD: decodeURIComponent(db.password) },
      encoding: "utf8",
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || "Database export failed");
  }
  await recordAudit({
    actorId,
    action: "settings.backup",
    entityType: "Setting",
    entityId: "backup",
    metadata: { file: file.split(/[/\\]/).pop() },
  });
  return `Backup saved as ${file.split(/[/\\]/).pop()}`;
}

export async function restoreDatabase(actorId: string, file: string): Promise<string> {
  const safe = file.split(/[/\\]/).pop() ?? "";
  if (!/^unibaazar-[A-Za-z0-9._-]+\.sql$/.test(safe)) {
    throw new Error("Choose a backup file");
  }
  const path = join(backupDir(), safe);
  if (!existsSync(path)) {
    throw new Error("That backup file is missing");
  }
  const sql = readFileSync(path);
  const db = databaseUrl();
  const result = spawnSync(
    mysqlBin("mysql"),
    [
      "-h",
      db.hostname,
      "-P",
      db.port || "3306",
      "-u",
      decodeURIComponent(db.username),
      decodeURIComponent(db.pathname.replace(/^\//, "")),
    ],
    {
      env: { ...process.env, MYSQL_PWD: decodeURIComponent(db.password) },
      input: sql,
    },
  );
  if (result.error || result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    throw new Error(result.error?.message || stderr || "Restore failed");
  }
  await recordAudit({
    actorId,
    action: "settings.restore",
    entityType: "Setting",
    entityId: "backup",
    metadata: { file: safe },
  });
  return `Restored ${safe}`;
}
