import type { Order, Payment } from "@prisma/client";

export type BookableOrder = Order & { payments: Payment[] };

export type CourierBooking = {
  consignmentId: string;
  trackingCode: string;
  message: string;
};

export type CourierBalance = {
  amount: number;
  raw: unknown;
};

export type CourierFraudCheck = {
  /** Total past orders this phone number has with the courier. */
  totalOrders: number;
  /** Of those, how many were successfully delivered. */
  successfulDeliveries: number;
  /** Of those, how many were cancelled/returned. */
  cancelledOrders: number;
  raw: unknown;
};

export interface CourierProvider {
  readonly id: string;
  book(order: BookableOrder): Promise<CourierBooking>;
  status(consignmentId: string): Promise<string | null>;
  /** Optional: not every provider exposes these, so callers must check
   * before calling (e.g. `"balance" in provider`). */
  balance?(): Promise<CourierBalance>;
  fraudCheck?(phone: string): Promise<CourierFraudCheck>;
}
