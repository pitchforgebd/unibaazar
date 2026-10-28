import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ApiError } from "@/server/http";
import { rateLimitPersistent } from "./rate-limit-db";

describe("rateLimitPersistent (requires .env.test's DATABASE_URL)", () => {
  const buckets: string[] = [];

  afterAll(async () => {
    await prisma.rateLimitHit.deleteMany({ where: { bucket: { in: buckets } } });
    await prisma.$disconnect();
  });

  function bucket(): string {
    const name = `test:${randomUUID()}`;
    buckets.push(name);
    return name;
  }

  it("allows exactly `limit` attempts, then rejects with a 429", async () => {
    const name = bucket();
    await rateLimitPersistent(name, 3, 60_000);
    await rateLimitPersistent(name, 3, 60_000);
    await rateLimitPersistent(name, 3, 60_000);
    await expect(rateLimitPersistent(name, 3, 60_000)).rejects.toBeInstanceOf(ApiError);
  });

  it("survives a 'restart' — the count comes from the DB, not process memory", async () => {
    const name = bucket();
    // Two hits written directly, as an earlier process would have left them.
    await prisma.rateLimitHit.createMany({
      data: [{ bucket: name }, { bucket: name }],
    });
    await expect(rateLimitPersistent(name, 2, 60_000)).rejects.toBeInstanceOf(ApiError);
  });

  it("ignores hits older than the window, and prunes them", async () => {
    const name = bucket();
    const stale = new Date(Date.now() - 10 * 60_000);
    await prisma.rateLimitHit.create({ data: { bucket: name, createdAt: stale } });
    await rateLimitPersistent(name, 1, 60_000);
    const rows = await prisma.rateLimitHit.findMany({ where: { bucket: name } });
    expect(rows).toHaveLength(1);
    expect(rows[0].createdAt.getTime()).toBeGreaterThan(stale.getTime());
  });

  it("keeps separate buckets independent", async () => {
    const a = bucket();
    const b = bucket();
    await rateLimitPersistent(a, 1, 60_000);
    await expect(rateLimitPersistent(a, 1, 60_000)).rejects.toBeInstanceOf(ApiError);
    await expect(rateLimitPersistent(b, 1, 60_000)).resolves.toBeUndefined();
  });
});
