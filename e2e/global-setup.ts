import { PrismaClient } from "@prisma/client";

/**
 * Clears the DB-backed rate-limit counters before each Playwright run.
 *
 * Phase 12 made the login/OTP/checkout/contact limits persistent
 * (src/server/security/rate-limit-db.ts) so they survive a restart —
 * which is the whole point in production, but it means the suites now
 * share one budget. The parity suite alone logs in 8 times, which is
 * exactly the login limit, so any run that follows another suite (or a
 * manual QA pass) would start already exhausted and fail for a reason
 * that has nothing to do with the code under test.
 *
 * The limiter itself is covered directly by
 * src/server/security/rate-limit-db.integration.test.ts, so clearing it
 * here loses no coverage — it only stops one suite from rate-limiting
 * the next.
 */
function startOfDhakaDay(now = new Date()): Date {
  const offsetMs = 6 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMs);
}

export default async function globalSetup(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.rateLimitHit.deleteMany({});
    // Same problem, different guard: src/server/security/fraud.ts rejects
    // a 6th order from one IP in a Dhaka day, and every browser project
    // that runs the COD critical path places one from 127.0.0.1. Three
    // engines plus desktop and mobile is already at the ceiling, so a
    // second full-matrix run in the same day would fail on the guard
    // rather than on anything real. Only today's localhost rows are
    // removed — seeded historical orders carry no IP and are untouched.
    // decideFraud() itself is unit-tested in
    // src/server/security/security.test.ts, so nothing is left uncovered.
    await prisma.order.deleteMany({
      where: { ipAddress: "127.0.0.1", placedAt: { gte: startOfDhakaDay() } },
    });
  } finally {
    await prisma.$disconnect();
  }
}
