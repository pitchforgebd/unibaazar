import { describe, expect, it } from "vitest";
import {
  DEFAULT_DELIVERY_SETTINGS,
  deliveryCharge,
  parseDeliverySettings,
} from "@/modules/pricing/delivery";
import { fromTakaNumber, poisha, toTakaNumber, ZERO } from "@/modules/pricing/money";

describe("deliveryCharge", () => {
  it("is zero when merchandise is zero", () => {
    expect(deliveryCharge("inside-dhaka", ZERO)).toBe(ZERO);
  });

  it("is zero once merchandise reaches the free-shipping threshold", () => {
    expect(deliveryCharge("inside-dhaka", DEFAULT_DELIVERY_SETTINGS.freeFrom)).toBe(ZERO);
    expect(
      deliveryCharge(
        "outside-dhaka",
        fromTakaNumber(toTakaNumber(DEFAULT_DELIVERY_SETTINGS.freeFrom) + 1),
      ),
    ).toBe(ZERO);
  });

  it("charges the inside-dhaka rate for inside-dhaka under the threshold", () => {
    expect(deliveryCharge("inside-dhaka", poisha(100))).toBe(
      DEFAULT_DELIVERY_SETTINGS.inside,
    );
  });

  it("charges the outside-dhaka rate for outside-dhaka under the threshold", () => {
    expect(deliveryCharge("outside-dhaka", poisha(100))).toBe(
      DEFAULT_DELIVERY_SETTINGS.outside,
    );
  });

  it("uses the settings passed in rather than the defaults when given", () => {
    const custom = {
      inside: poisha(5000),
      outside: poisha(9000),
      freeFrom: poisha(100000),
    };
    expect(deliveryCharge("inside-dhaka", poisha(100), custom)).toBe(custom.inside);
    expect(deliveryCharge("outside-dhaka", poisha(100), custom)).toBe(custom.outside);
  });
});

describe("parseDeliverySettings", () => {
  it("falls back to the defaults when every key is missing", () => {
    expect(parseDeliverySettings({})).toEqual(DEFAULT_DELIVERY_SETTINGS);
  });

  it("falls back to the defaults when a value isn't a number", () => {
    expect(
      parseDeliverySettings({
        "delivery.inside": "not-a-number",
        "delivery.outside": null,
        "delivery.freeFrom": undefined,
      }),
    ).toEqual(DEFAULT_DELIVERY_SETTINGS);
  });

  it("reads real admin-set values, converting Taka to Poisha", () => {
    const parsed = parseDeliverySettings({
      "delivery.inside": 90,
      "delivery.outside": 150,
      "delivery.freeFrom": 5000,
    });
    expect(parsed).toEqual({
      inside: fromTakaNumber(90),
      outside: fromTakaNumber(150),
      freeFrom: fromTakaNumber(5000),
    });
  });

  it("mixes real values and fallbacks independently per key", () => {
    const parsed = parseDeliverySettings({ "delivery.inside": 90 });
    expect(parsed.inside).toBe(fromTakaNumber(90));
    expect(parsed.outside).toBe(DEFAULT_DELIVERY_SETTINGS.outside);
    expect(parsed.freeFrom).toBe(DEFAULT_DELIVERY_SETTINGS.freeFrom);
  });
});
