import assert from "node:assert/strict";
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

function throws(run: () => void): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : "unknown";
  }
  throw new Error("expected a failure");
}

resetRateLimits();
rateLimit("login:test", 2, 1000, 1_000);
rateLimit("login:test", 2, 1000, 1_100);
assert.equal(
  throws(() => rateLimit("login:test", 2, 1000, 1_200)),
  "Too many attempts. Try again shortly.",
);
rateLimit("login:test", 2, 1000, 3_000);

const evil = new Request("http://localhost:3000/api/v1/auth/login", {
  method: "POST",
  headers: { origin: "https://evil.example", host: "localhost:3000" },
});
assert.equal(
  throws(() => assertSameOrigin(evil)),
  "Cross-site request blocked",
);
assertSameOrigin(new Request("http://localhost:3000/api/v1/orders", { method: "POST" }));

assert.equal(decideFraud(clean), null);
assert.ok(decideFraud({ ...clean, blacklistedPhone: true }));
assert.ok(decideFraud({ ...clean, recentDuplicate: true }));
assert.ok(decideFraud({ ...clean, cancelledOrders: 3, deliveredOrders: 0 }));
assert.equal(decideFraud({ ...clean, cancelledOrders: 3, deliveredOrders: 1 }), null);
assert.ok(decideFraud({ ...clean, courier: { total: 4, success: 1 } }));
assert.equal(decideFraud({ ...clean, courier: { total: 4, success: 3 } }), null);

assert.equal(roleAllows("customer", "orders.manage"), false);
assert.equal(roleAllows("staff", "orders.manage"), true);
assert.equal(roleAllows("accountant", "orders.manage"), false);
assert.equal(roleAllows("super-admin", "users.manage"), true);

assert.equal(signaturesMatch("secret", "secret"), true);
assert.equal(signaturesMatch("secret", "secretx"), false);
assert.equal(signaturesMatch(null, "secret"), false);

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const dirty = Uint8Array.from([...png, 1, 2, 3, 4]);
const cleanPng = reencodeImage(dirty, "image/png");
assert.equal(cleanPng.length, png.length);
assert.equal(cleanPng[cleanPng.length - 1], png[png.length - 1]);
assert.throws(() => reencodeImage(Uint8Array.from([1, 2, 3, 4]), "image/png"));
console.log("security checks passed");
