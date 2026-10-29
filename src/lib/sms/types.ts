export type SmsSendResult = {
  status: "sent" | "failed";
  providerResponse?: unknown;
  errorMessage?: string;
};

export type SmsBalance = {
  amount: number;
  raw: unknown;
};

export interface SmsProvider {
  readonly id: string;
  send(to: string, body: string): Promise<SmsSendResult>;
  /** Optional: not every provider exposes this. */
  balance?(): Promise<SmsBalance>;
}
