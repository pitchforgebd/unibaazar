export type CourierRatio = {
  total: number;
  success: number;
};

export type FraudFacts = {
  blacklistedPhone: boolean;
  blacklistedIp: boolean;
  recentDuplicate: boolean;
  cancelledOrders: number;
  deliveredOrders: number;
  ordersFromIpToday: number;
  ordersFromDeviceToday: number;
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
  if (facts.ordersFromIpToday >= 5 || facts.ordersFromDeviceToday >= 5) {
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
