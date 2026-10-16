import type { Order, Payment } from "@prisma/client";

export type BookableOrder = Order & { payments: Payment[] };

export type CourierBooking = {
  consignmentId: string;
  trackingCode: string;
  message: string;
};

export interface CourierProvider {
  readonly id: string;
  book(order: BookableOrder): Promise<CourierBooking>;
  status(consignmentId: string): Promise<string | null>;
}
