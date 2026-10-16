import { prisma } from "@/lib/db";

export async function loadSecret(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return typeof row?.value === "string" ? row.value : "";
}
