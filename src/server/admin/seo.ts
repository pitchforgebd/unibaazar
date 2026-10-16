import { prisma } from "@/lib/db";
import { saveSetting } from "@/server/settings/store";
import { defaultRobots, loadRobots } from "@/server/seo/public";
import { recordAudit } from "@/server/security/audit";

function cleanPath(value: string): string {
  const collapsed = value.replace(/\/+/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed;
}

export async function robotsDraft(): Promise<string> {
  const saved = await loadRobots();
  return saved || defaultRobots();
}

export async function saveRobots(actorId: string, robots: string): Promise<void> {
  await saveSetting("seo.robots", robots);
  await recordAudit({
    actorId,
    action: "seo.robots",
    entityType: "Setting",
    entityId: "seo.robots",
  });
}

export async function listRedirects() {
  const rows = await prisma.redirect.findMany({ orderBy: { fromPath: "asc" }, take: 50 });
  return rows.map((row) => ({
    id: row.id,
    fromPath: row.fromPath,
    toPath: row.toPath,
    statusCode: row.statusCode,
    isActive: row.isActive,
  }));
}

export async function saveRedirect(
  actorId: string,
  input: { fromPath: string; toPath: string; statusCode: 301 | 302 },
): Promise<void> {
  const fromPath = cleanPath(input.fromPath);
  const toPath = cleanPath(input.toPath);
  const row = await prisma.redirect.upsert({
    where: { fromPath },
    update: { toPath, statusCode: input.statusCode, isActive: true },
    create: { fromPath, toPath, statusCode: input.statusCode, isActive: true },
  });
  await recordAudit({
    actorId,
    action: "seo.redirect",
    entityType: "Redirect",
    entityId: row.id,
    metadata: { fromPath, toPath, statusCode: input.statusCode },
  });
}

export async function deleteRedirect(actorId: string, id: string): Promise<void> {
  await prisma.redirect.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "seo.redirect.delete",
    entityType: "Redirect",
    entityId: id,
  });
}

export async function listNotFound() {
  const rows = await prisma.notFoundHit.findMany({
    orderBy: { lastSeen: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    path: row.path,
    count: row.count,
    when: row.lastSeen.toISOString().slice(0, 16).replace("T", " "),
  }));
}
