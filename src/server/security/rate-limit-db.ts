import { prisma } from "@/lib/db";
import { ApiError } from "@/server/http";

/**
 * The DB-backed half of this app's rate limiting (§5.6: "rate limiting
 * backed by the DB (login, OTP, checkout, contact)"). The in-memory
 * limiter in rate-limit.ts still covers the high-volume telemetry
 * routes, where a DB write per page view would cost more than the
 * limit is worth — see docs/decisions/0023-phase-12-scope-hardening.md.
 *
 * Why this matters in practice: the in-memory limiter resets on every
 * server restart, so a restart (a deploy, a crash, or just `npm run
 * start` again) hands an attacker a fresh budget. Persisting the hits
 * closes that. Old rows for the bucket being checked are pruned on the
 * way through, so the table self-maintains without its own cron.
 */
export async function rateLimitPersistent(
  bucket: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
): Promise<void> {
  const since = new Date(now.getTime() - windowMs);
  // Prune this bucket's expired rows first so the count below is exact
  // and the table doesn't grow without bound.
  await prisma.rateLimitHit.deleteMany({
    where: { bucket, createdAt: { lt: since } },
  });
  const hits = await prisma.rateLimitHit.count({
    where: { bucket, createdAt: { gte: since } },
  });
  if (hits >= limit) {
    throw new ApiError(429, "Too many attempts. Try again shortly.");
  }
  await prisma.rateLimitHit.create({ data: { bucket, createdAt: now } });
}
