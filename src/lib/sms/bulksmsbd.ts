import { loadIntegrations } from "@/server/settings/store";
import { loadSecret } from "@/server/settings/secret";
import type { SmsProvider, SmsSendResult } from "./types";

async function config(): Promise<{ apiKey: string; senderId: string } | null> {
  const [secretKey, integrations] = await Promise.all([
    loadSecret("secret.sms"),
    loadIntegrations(),
  ]);
  const apiKey = secretKey || process.env.SMS_API_KEY || "";
  const senderId = integrations.smsSender || process.env.SMS_SENDER_ID || "";
  if (!apiKey || !senderId) {
    return null;
  }
  return { apiKey, senderId };
}

async function send(to: string, body: string): Promise<SmsSendResult> {
  const configured = await config();
  if (!configured) {
    return { status: "failed", errorMessage: "BulkSMSBD is not configured" };
  }
  try {
    const query = new URLSearchParams({
      api_key: configured.apiKey,
      type: "text",
      number: to,
      senderid: configured.senderId,
      message: body,
    });
    const response = await fetch(`https://bulksmsbd.net/api/smsapi?${query.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    // BulkSMSBD replies with a bare numeric response code (202 = submitted). Reconfirm against
    // the dashboard's API document once a real account exists — this is sourced from third-party
    // client docs, not an official page.
    if (response.ok && text.trim().startsWith("202")) {
      return { status: "sent", providerResponse: text };
    }
    return {
      status: "failed",
      providerResponse: text,
      errorMessage: `BulkSMSBD responded: ${text}`,
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const bulkSmsBdProvider: SmsProvider = { id: "bulksmsbd", send };
