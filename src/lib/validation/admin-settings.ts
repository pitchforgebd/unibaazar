import { z } from "zod";

const money = z.coerce.number().min(0, "Use 0 or a positive amount").max(1000000);
const hex = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a color like #F95B09");

export const generalSchema = z.object({
  name: z.string().trim().min(1, "Enter the site name").max(80),
  description: z.string().trim().min(1, "Enter a short description").max(300),
  logo: z.string().trim().max(500),
  favicon: z.string().trim().max(500),
  phone: z.string().trim().min(1, "Enter a phone number").max(32),
  email: z.string().trim().email("Enter a contact email").max(191),
  address: z.string().trim().min(1, "Enter an address").max(191),
  hours: z.string().trim().max(191),
  currency: z.string().trim().min(3, "Enter a currency").max(8),
  timezone: z.string().trim().min(1, "Enter a timezone").max(64),
});

export const themeSchema = z.object({
  primary: hex,
  font: z.enum(["poppins", "system"]),
  showTopBar: z.boolean(),
  showChat: z.boolean(),
});

export const checkoutSchema = z.object({
  inside: money,
  outside: money,
  freeFrom: money,
  guest: z.boolean(),
  minOrder: money,
  cod: z.boolean(),
  orderPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z]{2,6}$/, "Use 2 to 6 capital letters"),
});

export const integrationSchema = z.object({
  bkashEnabled: z.boolean(),
  bkashMerchant: z.string().trim().max(191),
  nagadEnabled: z.boolean(),
  nagadMerchant: z.string().trim().max(191),
  smsSender: z.string().trim().max(32),
  emailHost: z.string().trim().max(191),
  emailPort: z.string().trim().max(6),
  emailUser: z.string().trim().max(191),
  emailFrom: z.string().trim().max(191),
  courierUser: z.string().trim().max(191),
  bkashSecret: z.string().max(500),
  nagadSecret: z.string().max(500),
  smsSecret: z.string().max(500),
  emailSecret: z.string().max(500),
  courierSecret: z.string().max(500),
});

export const courierWebhookSchema = z.object({
  token: z
    .string()
    .trim()
    .max(200)
    .regex(/^[A-Za-z0-9\-_.=]*$/, "Letters, digits and - _ . = only"),
});

export const invoiceSchema = z.object({
  vatPercent: z.coerce.number().min(0).max(100),
  prefix: z
    .string()
    .trim()
    .regex(/^[A-Z]{2,8}$/, "Use 2 to 8 capital letters"),
  footer: z.string().trim().max(500),
  signature: z.string().trim().max(191),
});

export const socialSchema = z.object({
  facebook: z.string().trim().max(500),
  instagram: z.string().trim().max(500),
  youtube: z.string().trim().max(500),
  whatsapp: z.string().trim().min(1, "Enter a WhatsApp link").max(500),
  messenger: z.string().trim().min(1, "Enter a Messenger link").max(500),
  googleClientId: z.string().trim().max(191),
  facebookAppId: z.string().trim().max(191),
  youtubeHomeVideo: z.string().trim().max(500),
  instagramPosts: z.string().trim().max(4000),
  autoPostProducts: z.boolean(),
  googleClientSecret: z.string().max(500),
  facebookAppSecret: z.string().max(500),
  facebookPageToken: z.string().max(500),
});

export const systemSchema = z.object({
  maintenance: z.boolean(),
  cookieText: z.string().trim().max(500),
  headerScript: z.string().max(5000),
  footerScript: z.string().max(5000),
});

export const alertsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  telegram: z.boolean(),
  whatsapp: z.boolean(),
  sound: z.boolean(),
  lowStock: z.boolean(),
  adminEmail: z.union([z.literal(""), z.string().trim().email()]),
  adminPhone: z.string().trim().max(32),
  telegramChatId: z.string().trim().max(64),
  whatsappPhone: z.string().trim().max(32),
  telegramToken: z.string().max(200),
});

export const restoreSchema = z.object({
  file: z
    .string()
    .trim()
    .regex(/^unibaazar-[A-Za-z0-9._-]+\.sql$/, "Choose a backup file"),
  confirm: z.string().refine((value) => value === "RESTORE", "Type RESTORE to confirm"),
});
