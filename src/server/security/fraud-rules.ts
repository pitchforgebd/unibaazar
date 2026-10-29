export type CourierRatio = {
  total: number;
  success: number;
};

/**
 * Daily order caps, in order of how well each key identifies one buyer.
 *
 * Phone is the real identity for this business (COD, phone-based
 * accounts), so it carries the tight cap. Device (the `ub_device`
 * cookie) is per-browser, so it's nearly as good. IP is the weakest of
 * the three here: Bangladesh's mobile carriers put huge numbers of
 * subscribers behind one CGNAT IPv4, so a low per-IP cap rejects real
 * customers at peak — the previous flat 5 meant the 6th order of the
 * day from an entire carrier's NAT pool was refused as fraud. It stays
 * as a backstop against one host flooding checkout, set high enough
 * that normal shared-IP traffic never reaches it.
 */
const PHONE_ORDER_CAP = 5;
const DEVICE_ORDER_CAP = 5;
const IP_ORDER_CAP = 40;

export type FraudFacts = {
  blacklistedPhone: boolean;
  blacklistedIp: boolean;
  recentDuplicate: boolean;
  cancelledOrders: number;
  deliveredOrders: number;
  ordersFromIpToday: number;
  ordersFromDeviceToday: number;
  ordersFromPhoneToday: number;
  courier: CourierRatio | null;
};

export function decideFraud(facts: FraudFacts): string | null {
  if (facts.blacklistedPhone || facts.blacklistedIp) {
    return "This phone number cannot place an order";
  }
  if (facts.recentDuplicate) {
    return "A matching order was just placed. Wait a few minutes before ordering again.";
  }
  if (facts.cancelledOrders >= 3 && facts.deliveredOrders === 0) {
    return "This phone has too many cancelled orders. Contact support to place a new one.";
  }
  if (facts.ordersFromPhoneToday >= PHONE_ORDER_CAP) {
    return "This number has already placed several orders today. Contact support to place another.";
  }
  if (facts.ordersFromDeviceToday >= DEVICE_ORDER_CAP) {
    return "Too many orders from this device today.";
  }
  if (facts.ordersFromIpToday >= IP_ORDER_CAP) {
    return "Too many orders from this connection today.";
  }
  if (
    facts.courier &&
    facts.courier.total >= 3 &&
    facts.courier.success / facts.courier.total < 0.5
  ) {
    return "The courier history for this phone needs a manual review. Contact support.";
  }
  return null;
}

export function lineSignature(lines: { variantId: string; qty: number }[]): string {
  return [...lines]
    .sort((left, right) => left.variantId.localeCompare(right.variantId))
    .map((line) => `${line.variantId}:${line.qty}`)
    .join("|");
}
