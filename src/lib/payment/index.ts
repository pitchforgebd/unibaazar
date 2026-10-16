import type { PaymentMethod } from "@prisma/client";
import { codProvider } from "./cod";
import { sslcommerzProvider } from "./sslcommerz";
import type { PaymentProvider } from "./types";

export * from "./types";

export function resolveProvider(method: PaymentMethod): PaymentProvider {
  if (method === "COD") {
    return codProvider;
  }
  // BKASH | NAGAD | ROCKET | CARD all route through the SSLCommerz aggregator today.
  // Add a lookup here when a direct-gateway adapter (e.g. bKash tokenized checkout) is built.
  return sslcommerzProvider;
}
