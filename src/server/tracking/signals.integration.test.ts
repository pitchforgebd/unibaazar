import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { loadTracking, saveSecretToken, saveTracking } from "@/server/tracking/config";
import { retryFailedConversions, sendServerEvent } from "@/server/tracking/signals";

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
    expect(updated.error).toContain("HTTP 401");
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

describe("sendServerEvent (requires .env.test's DATABASE_URL)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(async () => {
    await prisma.setting.deleteMany({
      where: { key: { in: ["secret.meta", "secret.tiktok", "tracking"] } },
    });
    await prisma.$disconnect();
  });

  it("sends the same event id to Meta and TikTok, logging each send", async () => {
    await saveTracking({
      ...(await loadTracking()),
      metaPixelId: "123456789",
      metaTestCode: "TEST123",
      tiktokPixelId: "C4A1B2C3D4E5",
      tiktokTestCode: "TEST456",
    });
    await saveSecretToken("secret.meta", "meta-token");
    await saveSecretToken("secret.tiktok", "tiktok-token");
    const send = vi.fn().mockImplementation(async () => new Response("{}"));
    global.fetch = send;
    const eventId = `relay-${randomUUID()}`;

    await sendServerEvent({
      name: "AddToCart",
      eventId,
      url: "https://unibaazar.com/product/x",
      data: { items: [{ id: "SKU", name: "Book", price: 100, quantity: 1 }] },
      user: { userAgent: "Mozilla/5.0", ip: "103.4.5.6", fbp: "fb.1.1.1", ttp: "t" },
    });

    expect(send).toHaveBeenCalledTimes(2);
    const [metaUrl, metaInit] = send.mock.calls[0];
    expect(metaUrl).toContain("/123456789/events?access_token=meta-token");
    const metaBody = JSON.parse(metaInit.body);
    expect(metaBody.test_event_code).toBe("TEST123");
    expect(metaBody.data[0]).toMatchObject({
      event_name: "AddToCart",
      event_id: eventId,
    });

    const [, tiktokInit] = send.mock.calls[1];
    expect(tiktokInit.headers["Access-Token"]).toBe("tiktok-token");
    const tiktokBody = JSON.parse(tiktokInit.body);
    expect(tiktokBody).toMatchObject({
      event_source: "web",
      event_source_id: "C4A1B2C3D4E5",
      test_event_code: "TEST456",
    });
    expect(tiktokBody.data[0].event_id).toBe(eventId);

    const logged = await prisma.conversionApiLog.findMany({
      where: { eventKey: eventId },
    });
    expect(logged.map((row) => row.provider).sort()).toEqual(["meta", "tiktok"]);
    expect(JSON.stringify(logged)).not.toContain("meta-token");
    await prisma.conversionApiLog.deleteMany({ where: { eventKey: eventId } });
  });

  it("records the platform's own error message on a failed send", async () => {
    await saveTracking({
      ...(await loadTracking()),
      metaPixelId: "123456789",
      tiktokPixelId: "",
    });
    await saveSecretToken("secret.meta", "meta-token");
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('{"error":{"message":"Invalid token"}}', { status: 400 }),
      );
    const eventId = `relay-${randomUUID()}`;

    await sendServerEvent({
      name: "Search",
      eventId,
      url: "https://unibaazar.com/search",
      data: { searchTerm: "lego" },
      user: { userAgent: "Mozilla/5.0" },
    });

    const [row] = await prisma.conversionApiLog.findMany({
      where: { eventKey: eventId },
    });
    expect(row.status).toBe("failed");
    expect(row.error).toContain("Invalid token");
    await prisma.conversionApiLog.deleteMany({ where: { eventKey: eventId } });
  });
});
