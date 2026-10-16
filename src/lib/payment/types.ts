export type PaymentInitResult =
  | { kind: "redirect"; redirectUrl: string; gatewayRef: string; raw?: unknown }
  | { kind: "instructions"; message: string; gatewayRef?: string };

export type PaymentIpnResult = {
  valid: boolean;
  gatewayRef: string;
  transactionId: string;
  status: "PAID" | "FAILED";
  amount?: number;
  raw: unknown;
};

export type PaymentOrderInput = {
  orderNumber: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress: string;
};

export interface PaymentProvider {
  readonly id: string;
  initiate(order: PaymentOrderInput): Promise<PaymentInitResult>;
  verifyIPN(fields: Record<string, string>): Promise<PaymentIpnResult>;
}
