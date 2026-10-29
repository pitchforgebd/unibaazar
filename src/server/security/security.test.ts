import { describe, expect, it } from "vitest";
import { decideFraud } from "@/server/security/fraud-rules";
import { clientIp } from "@/server/security/guard";
import { reencodeImage } from "@/server/security/images";
import { assertSameOrigin } from "@/server/security/origin";
import { roleAllows } from "@/server/security/permissions";
import { rateLimit, resetRateLimits } from "@/server/security/rate-limit";
import { signaturesMatch } from "@/server/security/signature";

const clean: Parameters<typeof decideFraud>[0] = {
  blacklistedPhone: false,
  blacklistedIp: false,
  recentDuplicate: false,
  cancelledOrders: 0,
  deliveredOrders: 1,
  ordersFromIpToday: 0,
  ordersFromDeviceToday: 0,
  ordersFromPhoneToday: 0,
  courier: null,
};

// Phase 13: the per-IP cap used to be 5, which on Bangladesh's CGNAT
// mobile networks meant the 6th order of the day from an entire
// carrier's NAT pool was refused as fraud. Phone and device carry the
// tight caps now; IP is a loose flood backstop. These tests pin that
// split so nobody quietly reverts it to an IP-first rule.
describe("decideFraud — daily order caps", () => {
  it("blocks a 5th order from one phone, the real per-buyer identity", () => {
    expect(decideFraud({ ...clean, ordersFromPhoneToday: 5 })).toMatch(/this number/i);
  });

  it("blocks a 5th order from one device", () => {
    expect(decideFraud({ ...clean, ordersFromDeviceToday: 5 })).toMatch(/this device/i);
  });

  it("allows a 6th order sharing an IP — a carrier NAT pool is not one buyer", () => {
    expect(decideFraud({ ...clean, ordersFromIpToday: 6 })).toBeNull();
  });

  it("still blocks a genuine single-IP flood", () => {
    expect(decideFraud({ ...clean, ordersFromIpToday: 40 })).toMatch(/this connection/i);
  });
});

describe("rateLimit", () => {
  it("throws once the window's attempt budget is exceeded, then recovers after it passes", () => {
    resetRateLimits();
    rateLimit("login:test", 2, 1000, 1_000);
    rateLimit("login:test", 2, 1000, 1_100);
    expect(() => rateLimit("login:test", 2, 1000, 1_200)).toThrowError(
      "Too many attempts. Try again shortly.",
    );
    expect(() => rateLimit("login:test", 2, 1000, 3_000)).not.toThrow();
  });
});

describe("clientIp", () => {
  function requestWith(headers: Record<string, string>): Request {
    return new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers,
    });
  }

  it("ignores a client-supplied X-Forwarded-For entry and trusts the proxy's", () => {
    // "9.9.9.9" is what the attacker put in the header; "203.0.113.7" is
    // what our own reverse proxy appended. Reading the leftmost entry
    // (as this used to) would let anyone pick their own rate-limit key —
    // or burn through someone else's bucket to lock them out.
    expect(clientIp(requestWith({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("uses the only entry when there is no proxy chain to speak of", () => {
    expect(clientIp(requestWith({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip, then to a placeholder", () => {
    expect(clientIp(requestWith({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(requestWith({}))).toBe("unknown");
  });
});

describe("assertSameOrigin", () => {
  it("blocks a cross-site origin and allows a request with no origin header", () => {
    const evil = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.example", host: "localhost:3000" },
    });
    expect(() => assertSameOrigin(evil)).toThrowError("Cross-site request blocked");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/v1/orders", { method: "POST" }),
      ),
    ).not.toThrow();
  });
});

describe("decideFraud", () => {
  it("flags blacklisted phones, duplicates, high cancellation ratio, and poor courier success", () => {
    expect(decideFraud(clean)).toBe(null);
    expect(decideFraud({ ...clean, blacklistedPhone: true })).toBeTruthy();
    expect(decideFraud({ ...clean, recentDuplicate: true })).toBeTruthy();
    expect(
      decideFraud({ ...clean, cancelledOrders: 3, deliveredOrders: 0 }),
    ).toBeTruthy();
    expect(decideFraud({ ...clean, cancelledOrders: 3, deliveredOrders: 1 })).toBe(null);
    expect(decideFraud({ ...clean, courier: { total: 4, success: 1 } })).toBeTruthy();
    expect(decideFraud({ ...clean, courier: { total: 4, success: 3 } })).toBe(null);
  });
});

describe("roleAllows", () => {
  it("matches the role/permission matrix", () => {
    expect(roleAllows("customer", "orders.manage")).toBe(false);
    expect(roleAllows("staff", "orders.manage")).toBe(true);
    expect(roleAllows("accountant", "orders.manage")).toBe(false);
    expect(roleAllows("super-admin", "users.manage")).toBe(true);
  });
});

describe("signaturesMatch", () => {
  it("compares signatures and rejects a null candidate", () => {
    expect(signaturesMatch("secret", "secret")).toBe(true);
    expect(signaturesMatch("secret", "secretx")).toBe(false);
    expect(signaturesMatch(null, "secret")).toBe(false);
  });
});

describe("reencodeImage", () => {
  it("strips trailing bytes appended after a valid PNG and rejects garbage input", () => {
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
    const dirty = Uint8Array.from([...png, 1, 2, 3, 4]);
    const cleanPng = reencodeImage(dirty, "image/png");
    expect(cleanPng.length).toBe(png.length);
    expect(cleanPng[cleanPng.length - 1]).toBe(png[png.length - 1]);
    expect(() => reencodeImage(Uint8Array.from([1, 2, 3, 4]), "image/png")).toThrow();
  });
});
