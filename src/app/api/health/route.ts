import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readVersion(): Promise<string> {
  try {
    const raw = await readFile(join(process.cwd(), "release-info.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "sha" in parsed &&
      typeof parsed.sha === "string"
    ) {
      return parsed.sha;
    }
  } catch {
    // No release-info.json (e.g. local dev) — fall through to "dev".
  }
  return "dev";
}

export async function GET() {
  const version = await readVersion();

  let db: "ok" | "fail" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "fail";
  }

  const status = db === "ok" ? "ok" : "degraded";
  return NextResponse.json(
    { status, version, db, uptime: Math.floor(process.uptime()) },
    { status: db === "ok" ? 200 : 503 },
  );
}
