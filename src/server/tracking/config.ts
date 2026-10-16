import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { saveSetting } from "@/server/settings/store";

export type TrackingSettings = {
  metaPixelId: string;
  metaTestCode: string;
  gtmId: string;
  ga4Id: string;
  adsId: string;
  adsLabel: string;
  searchConsole: string;
  tiktokPixelId: string;
  pinterestId: string;
  snapId: string;
  clarityId: string;
  hotjarId: string;
};

export const trackingDefaults: TrackingSettings = {
  metaPixelId: "",
  metaTestCode: "",
  gtmId: "",
  ga4Id: "",
  adsId: "",
  adsLabel: "",
  searchConsole: "",
  tiktokPixelId: "",
  pinterestId: "",
  snapId: "",
  clarityId: "",
  hotjarId: "",
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function text(row: Record<string, unknown> | null, key: keyof TrackingSettings): string {
  const value = row?.[key];
  return typeof value === "string" ? value : trackingDefaults[key];
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function loadTracking(): Promise<TrackingSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "tracking" } });
  const body = record(row?.value);
  return {
    metaPixelId: text(body, "metaPixelId"),
    metaTestCode: text(body, "metaTestCode"),
    gtmId: text(body, "gtmId"),
    ga4Id: text(body, "ga4Id"),
    adsId: text(body, "adsId"),
    adsLabel: text(body, "adsLabel"),
    searchConsole: text(body, "searchConsole"),
    tiktokPixelId: text(body, "tiktokPixelId"),
    pinterestId: text(body, "pinterestId"),
    snapId: text(body, "snapId"),
    clarityId: text(body, "clarityId"),
    hotjarId: text(body, "hotjarId"),
  };
}

export async function saveTracking(input: TrackingSettings): Promise<void> {
  await saveSetting("tracking", input as unknown as Prisma.InputJsonValue);
}

async function secretValue(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return typeof row?.value === "string" ? row.value : "";
}

export async function metaAccessToken(): Promise<string> {
  return secretValue("secret.meta");
}

export async function tiktokAccessToken(): Promise<string> {
  return secretValue("secret.tiktok");
}

export async function saveSecretToken(
  key: "secret.meta" | "secret.tiktok",
  value: string,
): Promise<void> {
  const next = value.trim();
  if (!next) {
    return;
  }
  await saveSetting(key, next, true);
}
