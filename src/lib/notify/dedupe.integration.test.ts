import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { claimNotification } from "@/lib/notify/dedupe";
import { sendSms } from "@/lib/sms/send";

describe("notification dedupe (requires .env.test's DATABASE_URL)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("the first claim of a key succeeds, every repeat is rejected", async () => {
    const key = `test-${randomUUID()}`;
    expect(await claimNotification(key)).toBe(true);
    expect(await claimNotification(key)).toBe(false);
    expect(await claimNotification(key)).toBe(false);
  });

  it("concurrent claims of the same key: exactly one wins", async () => {
    const key = `test-concurrent-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => claimNotification(key)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("sendSms logs a 'skipped' row and does not re-send on a repeated dedupe key", async () => {
    const dedupeKey = `sms-test-${randomUUID()}`;
    const phone = "01999999999";
    const body1 = `First attempt ${randomUUID()}`;
    const body2 = `Second attempt (should be skipped) ${randomUUID()}`;
    await sendSms(phone, body1, undefined, dedupeKey);
    await sendSms(phone, body2, undefined, dedupeKey);

    const rows = await prisma.smsLog.findMany({
      where: { to: phone, body: { in: [body1, body2] } },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].status).not.toBe("skipped");
    expect(rows[1].status).toBe("skipped");
  });

  it("sendSms with no dedupeKey always sends (no dedup applied)", async () => {
    const phone = "01999999998";
    const body1 = `No dedupe 1 ${randomUUID()}`;
    const body2 = `No dedupe 2 ${randomUUID()}`;
    await sendSms(phone, body1, undefined);
    await sendSms(phone, body2, undefined);

    const rows = await prisma.smsLog.findMany({
      where: { to: phone, body: { in: [body1, body2] } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status !== "skipped")).toBe(true);
  });
});
