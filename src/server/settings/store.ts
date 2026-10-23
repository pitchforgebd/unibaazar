import type { Prisma } from "@prisma/client";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/server/settings/secret";
import { THEME_PRESET_IDS, type ThemePresetId } from "@/lib/theme/presets";

export type GeneralSettings = {
  name: string;
  description: string;
  logo: string;
  favicon: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  currency: string;
  timezone: string;
};

export type ThemeSettings = {
  primary: string;
  font: "poppins" | "system";
  showTopBar: boolean;
  showChat: boolean;
  /** Phase 4 design system — which of the 4 token presets
   * (src/lib/theme/presets.ts) the storefront renders. Independent of
   * `primary` above, which only colors the thin top announcement bar. */
  presetId: ThemePresetId;
};

export type CheckoutSettings = {
  inside: number;
  outside: number;
  freeFrom: number;
  guest: boolean;
  minOrder: number;
  cod: boolean;
  orderPrefix: string;
};

export type IntegrationSettings = {
  bkashEnabled: boolean;
  bkashMerchant: string;
  nagadEnabled: boolean;
  nagadMerchant: string;
  sslcommerzEnabled: boolean;
  sslcommerzStoreId: string;
  sslcommerzSandbox: boolean;
  smsSender: string;
  emailHost: string;
  emailPort: string;
  emailUser: string;
  emailFrom: string;
  courierUser: string;
};

export type InvoiceSettings = {
  vatPercent: number;
  prefix: string;
  footer: string;
  signature: string;
};

export type SocialSettings = {
  facebook: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
  messenger: string;
  googleClientId: string;
  facebookAppId: string;
  youtubeHomeVideo: string;
  instagramPosts: string;
  autoPostProducts: boolean;
};

export type SystemSettings = {
  maintenance: boolean;
  cookieText: string;
  headerScript: string;
  footerScript: string;
};

export const generalDefaults: GeneralSettings = {
  name: siteConfig.name,
  description: siteConfig.description,
  logo: "",
  favicon: "",
  phone: siteConfig.contact.phoneDisplay,
  email: siteConfig.contact.email,
  address: siteConfig.contact.address,
  hours: "Sat–Thu, 10:00–20:00",
  currency: "BDT",
  timezone: "Asia/Dhaka",
};

export const themeDefaults: ThemeSettings = {
  // Matches the Bazaar preset's AA-compliant primary (src/lib/theme/
  // presets.ts) — the old default (#E64A00) only got 3.92:1 contrast with
  // the white text TopBar.tsx renders on top of it, caught by re-enabling
  // axe's color-contrast rule in e2e/a11y/key-pages.spec.ts for Phase 4.
  // An admin who types in their own custom top-bar color can still pick
  // something that fails contrast — this only fixes the shipped default.
  primary: "#C94607",
  font: "poppins",
  showTopBar: true,
  showChat: true,
  presetId: "bazaar",
};

export const checkoutDefaults: CheckoutSettings = {
  inside: 70,
  outside: 130,
  freeFrom: siteConfig.freeShippingThreshold,
  guest: true,
  minOrder: 0,
  cod: true,
  orderPrefix: "UB",
};

export const integrationDefaults: IntegrationSettings = {
  bkashEnabled: false,
  bkashMerchant: "",
  nagadEnabled: false,
  nagadMerchant: "",
  sslcommerzEnabled: false,
  sslcommerzStoreId: "",
  sslcommerzSandbox: true,
  smsSender: "",
  emailHost: "",
  emailPort: "587",
  emailUser: "",
  emailFrom: "",
  courierUser: "",
};

export const invoiceDefaults: InvoiceSettings = {
  vatPercent: 0,
  prefix: "INV",
  footer: "Thank you for shopping with UniBaazar.",
  signature: "",
};

export const socialDefaults: SocialSettings = {
  facebook: "",
  instagram: "",
  youtube: "",
  whatsapp: siteConfig.chat.whatsapp,
  messenger: siteConfig.chat.messenger,
  googleClientId: "",
  facebookAppId: "",
  youtubeHomeVideo: "",
  instagramPosts: "",
  autoPostProducts: false,
};

export const systemDefaults: SystemSettings = {
  maintenance: false,
  cookieText: "",
  headerScript: "",
  footerScript: "",
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function text(
  row: Record<string, unknown> | null,
  key: string,
  fallback: string,
): string {
  const value = row?.[key];
  return typeof value === "string" ? value : fallback;
}

function flag(
  row: Record<string, unknown> | null,
  key: string,
  fallback: boolean,
): boolean {
  const value = row?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function amount(
  row: Record<string, unknown> | null,
  key: string,
  fallback: number,
): number {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function readRow(key: string): Promise<Record<string, unknown> | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return record(row?.value);
}

export async function saveSetting(
  key: string,
  value: Prisma.InputJsonValue,
  isSecret = false,
): Promise<void> {
  if (isSecret && typeof value !== "string") {
    throw new Error(`Secret setting "${key}" must be stored as a string`);
  }
  const stored = isSecret ? encryptSecret(value as string) : value;
  await prisma.setting.upsert({
    where: { key },
    update: { value: stored, isSecret },
    create: { key, value: stored, isSecret },
  });
}

export async function loadGeneral(): Promise<GeneralSettings> {
  const row = await readRow("general");
  return {
    name: text(row, "name", generalDefaults.name),
    description: text(row, "description", generalDefaults.description),
    logo: text(row, "logo", generalDefaults.logo),
    favicon: text(row, "favicon", generalDefaults.favicon),
    phone: text(row, "phone", generalDefaults.phone),
    email: text(row, "email", generalDefaults.email),
    address: text(row, "address", generalDefaults.address),
    hours: text(row, "hours", generalDefaults.hours),
    currency: text(row, "currency", generalDefaults.currency),
    timezone: text(row, "timezone", generalDefaults.timezone),
  };
}

export async function loadTheme(): Promise<ThemeSettings> {
  const row = await readRow("theme");
  const font = text(row, "font", themeDefaults.font);
  const presetId = text(row, "presetId", themeDefaults.presetId);
  return {
    primary: text(row, "primary", themeDefaults.primary),
    font: font === "system" ? "system" : "poppins",
    showTopBar: flag(row, "showTopBar", themeDefaults.showTopBar),
    showChat: flag(row, "showChat", themeDefaults.showChat),
    presetId: (THEME_PRESET_IDS as string[]).includes(presetId)
      ? (presetId as ThemePresetId)
      : themeDefaults.presetId,
  };
}

export async function loadCheckout(): Promise<CheckoutSettings> {
  const [row, inside, outside, freeFrom] = await Promise.all([
    readRow("checkout"),
    prisma.setting.findUnique({ where: { key: "delivery.inside" } }),
    prisma.setting.findUnique({ where: { key: "delivery.outside" } }),
    prisma.setting.findUnique({ where: { key: "delivery.freeFrom" } }),
  ]);
  const numberOr = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    inside: numberOr(inside?.value, amount(row, "inside", checkoutDefaults.inside)),
    outside: numberOr(outside?.value, amount(row, "outside", checkoutDefaults.outside)),
    freeFrom: numberOr(
      freeFrom?.value,
      amount(row, "freeFrom", checkoutDefaults.freeFrom),
    ),
    guest: flag(row, "guest", checkoutDefaults.guest),
    minOrder: amount(row, "minOrder", checkoutDefaults.minOrder),
    cod: flag(row, "cod", checkoutDefaults.cod),
    orderPrefix: text(row, "orderPrefix", checkoutDefaults.orderPrefix),
  };
}

export async function loadIntegrations(): Promise<IntegrationSettings> {
  const row = await readRow("integrations");
  return {
    bkashEnabled: flag(row, "bkashEnabled", integrationDefaults.bkashEnabled),
    bkashMerchant: text(row, "bkashMerchant", integrationDefaults.bkashMerchant),
    nagadEnabled: flag(row, "nagadEnabled", integrationDefaults.nagadEnabled),
    nagadMerchant: text(row, "nagadMerchant", integrationDefaults.nagadMerchant),
    sslcommerzEnabled: flag(
      row,
      "sslcommerzEnabled",
      integrationDefaults.sslcommerzEnabled,
    ),
    sslcommerzStoreId: text(
      row,
      "sslcommerzStoreId",
      integrationDefaults.sslcommerzStoreId,
    ),
    sslcommerzSandbox: flag(
      row,
      "sslcommerzSandbox",
      integrationDefaults.sslcommerzSandbox,
    ),
    smsSender: text(row, "smsSender", integrationDefaults.smsSender),
    emailHost: text(row, "emailHost", integrationDefaults.emailHost),
    emailPort: text(row, "emailPort", integrationDefaults.emailPort),
    emailUser: text(row, "emailUser", integrationDefaults.emailUser),
    emailFrom: text(row, "emailFrom", integrationDefaults.emailFrom),
    courierUser: text(row, "courierUser", integrationDefaults.courierUser),
  };
}

export async function loadInvoice(): Promise<InvoiceSettings> {
  const row = await readRow("invoice");
  return {
    vatPercent: amount(row, "vatPercent", invoiceDefaults.vatPercent),
    prefix: text(row, "prefix", invoiceDefaults.prefix),
    footer: text(row, "footer", invoiceDefaults.footer),
    signature: text(row, "signature", invoiceDefaults.signature),
  };
}

export async function loadSocial(): Promise<SocialSettings> {
  const row = await readRow("social");
  return {
    facebook: text(row, "facebook", socialDefaults.facebook),
    instagram: text(row, "instagram", socialDefaults.instagram),
    youtube: text(row, "youtube", socialDefaults.youtube),
    whatsapp: text(row, "whatsapp", socialDefaults.whatsapp),
    messenger: text(row, "messenger", socialDefaults.messenger),
    googleClientId: text(row, "googleClientId", socialDefaults.googleClientId),
    facebookAppId: text(row, "facebookAppId", socialDefaults.facebookAppId),
    youtubeHomeVideo: text(row, "youtubeHomeVideo", socialDefaults.youtubeHomeVideo),
    instagramPosts: text(row, "instagramPosts", socialDefaults.instagramPosts),
    autoPostProducts: flag(row, "autoPostProducts", socialDefaults.autoPostProducts),
  };
}

export async function loadSystem(): Promise<SystemSettings> {
  const row = await readRow("system");
  return {
    maintenance: flag(row, "maintenance", systemDefaults.maintenance),
    cookieText: text(row, "cookieText", systemDefaults.cookieText),
    headerScript: text(row, "headerScript", systemDefaults.headerScript),
    footerScript: text(row, "footerScript", systemDefaults.footerScript),
  };
}
