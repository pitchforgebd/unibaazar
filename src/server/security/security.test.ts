import { describe, expect, it } from "vitest";
import { decideFraud } from "@/server/security/fraud-rules";
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
  courier: null,
};

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
