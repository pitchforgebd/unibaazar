import { prisma } from "@/lib/db";
import { saveSetting } from "@/server/settings/store";
import { isStaffRole } from "@/server/security/permissions";

function parseList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  return [];
}

export async function adminIpAllowlist(): Promise<string[]> {
  const row = await prisma.setting.findUnique({
    where: { key: "security.adminIpAllowlist" },
  });
  return parseList(row?.value);
}

export async function adminIpAllowlistText(): Promise<string> {
  return (await adminIpAllowlist()).join("\n");
}

export async function assertAdminIpAllowed(role: string, ip: string): Promise<boolean> {
  if (!isStaffRole(role)) {
    return true;
  }
  const allow = await adminIpAllowlist();
  if (allow.length === 0) {
    return true;
  }
  const normalized = ip.trim();
  if (allow.includes(normalized)) {
    return true;
  }
  if (
    (normalized === "::1" || normalized === "127.0.0.1" || normalized === "localhost") &&
    (allow.includes("127.0.0.1") || allow.includes("::1") || allow.includes("localhost"))
  ) {
    return true;
  }
  return false;
}

export async function saveAdminIpAllowlist(value: string): Promise<void> {
  const lines = parseList(value);
  await saveSetting("security.adminIpAllowlist", lines);
}
