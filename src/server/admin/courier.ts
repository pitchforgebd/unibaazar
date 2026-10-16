import { steadfastProvider } from "@/lib/courier/steadfast";

export type { CourierBooking } from "@/lib/courier/types";

export const bookWithSteadfast = steadfastProvider.book;
export const steadfastStatus = steadfastProvider.status;
