import type { PaymentProvider } from "./types";

export const codProvider: PaymentProvider = {
  id: "cod",
  async initiate() {
    return { kind: "instructions", message: "Pay the rider on delivery" };
  },
  async verifyIPN() {
    throw new Error("Cash on delivery has no IPN to verify");
  },
};
