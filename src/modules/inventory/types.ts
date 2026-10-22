export type ReservationLine = {
  variantId: string;
  qty: number;
};

export type ReservationFailure = {
  variantId: string;
  sku: string;
  available: number;
  requested: number;
};

export class StockUnavailableError extends Error {
  constructor(public readonly failures: ReservationFailure[]) {
    super(
      failures.map((f) => `Only ${f.available} left for ${f.sku}`).join("; ") ||
        "Not enough stock",
    );
    this.name = "StockUnavailableError";
  }
}

export class FlashLimitReachedError extends Error {
  constructor(public readonly sku: string) {
    super(`The flash quantity for ${sku} is used up`);
    this.name = "FlashLimitReachedError";
  }
}

export const DEFAULT_RESERVATION_TTL_MINUTES = 20;
