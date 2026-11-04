import { describe, expect, it } from "vitest";
import { trackNames } from "@/lib/tracking/names";
import { trackEventSchema } from "@/lib/validation/admin-tracking";

describe("the tracking API schema", () => {
  it("accepts every known event name", () => {
    for (const name of trackNames) {
      expect(
        trackEventSchema.safeParse({ name, eventId: "order-number-123" }).success,
      ).toBe(true);
    }
  });

  it("rejects an unknown event name", () => {
    expect(
      trackEventSchema.safeParse({ name: "NotARealEvent", eventId: "order-number-123" })
        .success,
    ).toBe(false);
  });
});
