export type SmsSendResult = {
  status: "sent" | "failed";
  providerResponse?: unknown;
  errorMessage?: string;
};

export interface SmsProvider {
  readonly id: string;
  send(to: string, body: string): Promise<SmsSendResult>;
}
