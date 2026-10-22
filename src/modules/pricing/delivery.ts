import { clampMin0, fromTakaNumber, type Poisha, ZERO } from "@/modules/pricing/money";

export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

export type DeliverySettings = {
  inside: Poisha;
  outside: Poisha;
  freeFrom: Poisha;
};

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  inside: fromTakaNumber(70),
  outside: fromTakaNumber(130),
  freeFrom: fromTakaNumber(6500),
};

/**
 * The single place delivery charge is computed — server (checkout, order
 * placement) and client (checkout page preview) both call this with the
 * same settings, closing the duplication the Phase 0 audit flagged between
 * src/server/checkout/quote.ts and src/lib/catalog/pricing.ts (one read
 * admin-set Settings, the other hardcoded 70/130/6500 and never agreed).
 */
export function deliveryCharge(
  area: DeliveryArea,
  merchandise: Poisha,
  settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS,
): Poisha {
  if (merchandise <= 0 || merchandise >= settings.freeFrom) {
    return ZERO;
  }
  return clampMin0(area === "inside-dhaka" ? settings.inside : settings.outside);
}

/** Parses the flat key->value map `/api/v1/settings` (and the server-side
 * Setting table) returns into typed, Poisha delivery settings, falling back
 * to the documented defaults for any missing key. */
export function parseDeliverySettings(
  raw: Record<string, unknown>,
  fallback: DeliverySettings = DEFAULT_DELIVERY_SETTINGS,
): DeliverySettings {
  const read = (key: string, fallbackValue: Poisha): Poisha => {
    const value = raw[key];
    return typeof value === "number" ? fromTakaNumber(value) : fallbackValue;
  };
  return {
    inside: read("delivery.inside", fallback.inside),
    outside: read("delivery.outside", fallback.outside),
    freeFrom: read("delivery.freeFrom", fallback.freeFrom),
  };
}
