import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { saveSecretToken } from "@/server/tracking/config";
import { retryFailedConversions } from "@/server/tracking/signals";

describe("retryFailedConversions (requires .env.test's DATABASE_URL)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(async () => {
    await prisma.setting.deleteMany({ where: { key: "secret.meta" } });
    await prisma.$disconnect();
  });

  it("retries a failed send, marks it sent once the provider accepts it", async () => {
    await saveSecretToken("secret.meta", "test-token");
    const row = await prisma.conversionApiLog.create({
      data: {
        provider: "meta",
        eventName: "Purchase",
        eventKey: `retry-test-${randomUUID()}`,
        endpoint: "https://graph.facebook.com/v21.0/123/events",
        payload: { data: [{ event_name: "Purchase" }] },
        status: "failed",
        error: "HTTP 401",
        attempts: 1,
      },
    });

    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await retryFailedConversions();
    expect(result.retried).toBeGreaterThanOrEqual(1);
    expect(result.fixed).toBeGreaterThanOrEqual(1);

    const updated = await prisma.conversionApiLog.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(updated.status).toBe("sent");
    expect(updated.error).toBeNull();
    expect(updated.attempts).toBe(2);
    await prisma.conversionApiLog.delete({ where: { id: row.id } });
  });

  it("leaves a still-failing send marked failed and increments attempts", async () => {
    await saveSecretToken("secret.meta", "test-token");
    const row = await prisma.conversionApiLog.create({
      data: {
        provider: "meta",
        eventName: "Purchase",
        eventKey: `retry-test-${randomUUID()}`,
        endpoint: "https://graph.facebook.com/v21.0/123/events",
        payload: { data: [{ event_name: "Purchase" }] },
        status: "failed",
        error: "HTTP 401",
        attempts: 2,
      },
    });

    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));

    await retryFailedConversions();

    const updated = await prisma.conversionApiLog.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(updated.status).toBe("failed");
    expect(updated.error).toBe("HTTP 401");
    expect(updated.attempts).toBe(3);
    await prisma.conversionApiLog.delete({ where: { id: row.id } });
  });

  it("does not retry a row that's already hit the attempt cap", async () => {
    const row = await prisma.conversionApiLog.create({
      data: {
        provider: "meta",
        eventName: "Purchase",
        eventKey: `retry-test-${randomUUID()}`,
        endpoint: "https://graph.facebook.com/v21.0/123/events",
        payload: { data: [{ event_name: "Purchase" }] },
        status: "failed",
        error: "HTTP 401",
        attempts: 5,
      },
    });

    global.fetch = vi.fn();
    await retryFailedConversions();
    expect(global.fetch).not.toHaveBeenCalled();

    const unchanged = await prisma.conversionApiLog.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(unchanged.attempts).toBe(5);
    expect(unchanged.status).toBe("failed");
    await prisma.conversionApiLog.delete({ where: { id: row.id } });
  });
});
