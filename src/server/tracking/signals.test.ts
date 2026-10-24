import { describe, expect, it } from "vitest";
import { trackNames as serverTrackNames } from "./signals";
import { trackNames as browserTrackNames } from "@/lib/tracking/browser";
import { trackEventSchema } from "@/lib/validation/admin-tracking";

// The event name lives in three independent places (this file's own
// trackNames, the client's in lib/tracking/browser.ts, and the zod enum
// the /api/v1/tracking route validates against) — nothing enforces they
// stay in sync except this test. AddToWishlist was missing from all
// three before Phase 9 (docs/decisions/0020-...); this guards against
// the next event silently landing in only one of them.
describe("tracking event names stay in sync across client/server/schema", () => {
  it("the server and client trackNames lists are identical", () => {
    expect(serverTrackNames).toEqual(browserTrackNames);
  });

  it("the API validation schema accepts every known event name", () => {
    for (const name of serverTrackNames) {
      expect(
        trackEventSchema.safeParse({ name, eventId: "order-number-123" }).success,
      ).toBe(true);
    }
  });

  it("the API validation schema rejects an unknown event name", () => {
    expect(
      trackEventSchema.safeParse({ name: "NotARealEvent", eventId: "order-number-123" })
        .success,
    ).toBe(false);
  });
});
