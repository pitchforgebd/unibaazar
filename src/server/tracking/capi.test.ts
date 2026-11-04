import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  metaEvent,
  normalizePhone,
  tiktokEvent,
  type ServerEvent,
} from "@/server/tracking/capi";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const purchase: ServerEvent = {
  name: "Purchase",
  eventId: "UB-1001",
  url: "https://unibaazar.com/order-success/UB-1001",
  data: {
    value: 1060,
    transactionId: "UB-1001",
    items: [{ id: "SKU-1", name: "Story Book", price: 500, quantity: 2 }],
  },
  user: {
    phone: "01829317005",
    email: " Parent@Example.COM ",
    ip: "103.4.5.6",
    userAgent: "Mozilla/5.0",
    fbp: "fb.1.1.1",
    ttp: "ttp-1",
    ttclid: "click-1",
  },
};

describe("normalizePhone", () => {
  it("adds Bangladesh's country code and drops the leading zero", () => {
    expect(normalizePhone("01829317005")).toBe("8801829317005");
  });

  it("leaves an already international number alone, whatever its formatting", () => {
    expect(normalizePhone("+880 1829-317005")).toBe("8801829317005");
    expect(normalizePhone("8801829317005")).toBe("8801829317005");
  });
});

describe("metaEvent", () => {
  const body = metaEvent(purchase);
  const user = body?.user_data as Record<string, unknown>;

  it("hashes contact details the way Meta requires", () => {
    expect(user.ph).toEqual([sha("8801829317005")]);
    expect(user.em).toEqual([sha("parent@example.com")]);
  });

  it("sends client_user_agent and ip, unhashed, as website events require", () => {
    expect(user.client_user_agent).toBe("Mozilla/5.0");
    expect(user.client_ip_address).toBe("103.4.5.6");
  });

  it("carries the same event id and name the browser pixel uses, so Meta dedupes", () => {
    expect(body).toMatchObject({
      event_name: "Purchase",
      event_id: "UB-1001",
      action_source: "website",
    });
  });

  it("carries catalog fields in custom_data", () => {
    expect(body?.custom_data).toMatchObject({
      currency: "BDT",
      value: 1060,
      content_ids: ["SKU-1"],
      order_id: "UB-1001",
    });
  });

  it("omits an ip address that isn't one", () => {
    const row = metaEvent({ ...purchase, user: { ip: "unknown", userAgent: "x" } });
    expect(row?.user_data).toEqual({ client_user_agent: "x" });
  });

  it("returns null for an event Meta has no name for", () => {
    expect(metaEvent({ ...purchase, name: "ViewCart" })).toBeNull();
  });
});

describe("tiktokEvent", () => {
  const body = tiktokEvent(purchase);

  it("uses TikTok's event name and hashes the E.164 phone", () => {
    expect(body?.event).toBe("CompletePayment");
    expect(body?.user).toMatchObject({
      phone: sha("+8801829317005"),
      email: sha("parent@example.com"),
      ttp: "ttp-1",
      ttclid: "click-1",
      ip: "103.4.5.6",
      user_agent: "Mozilla/5.0",
    });
  });

  it("carries the page url and contents", () => {
    expect(body?.page).toEqual({ url: purchase.url });
    expect(body?.properties).toMatchObject({ value: 1060, currency: "BDT" });
  });
});
