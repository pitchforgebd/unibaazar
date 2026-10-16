import { absoluteUrl } from "@/lib/seo/urls";
import type {
  PaymentInitResult,
  PaymentIpnResult,
  PaymentOrderInput,
  PaymentProvider,
} from "./types";

type SslcommerzConfig = {
  storeId: string;
  storePass: string;
  baseUrl: string;
};

type SessionResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
};

type ValidatorResponse = {
  status?: string;
  tran_id?: string;
  amount?: string;
  val_id?: string;
};

function config(): SslcommerzConfig | null {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASS;
  if (!storeId || !storePass) {
    return null;
  }
  const sandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
  return {
    storeId,
    storePass,
    baseUrl: sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com",
  };
}

async function initiate(order: PaymentOrderInput): Promise<PaymentInitResult> {
  const configured = config();
  if (!configured) {
    return {
      kind: "instructions",
      message:
        "Online gateway checkout isn't configured yet. Add SSLCommerz sandbox keys to enable it.",
    };
  }
  const webhookUrl = absoluteUrl("/api/v1/payments/webhooks");
  const body = new URLSearchParams({
    store_id: configured.storeId,
    store_passwd: configured.storePass,
    total_amount: order.amount.toFixed(2),
    currency: order.currency ?? "BDT",
    tran_id: order.orderNumber,
    success_url: `${webhookUrl}?event=success`,
    fail_url: `${webhookUrl}?event=fail`,
    cancel_url: `${webhookUrl}?event=cancel`,
    ipn_url: webhookUrl,
    cus_name: order.customerName,
    cus_email: order.customerEmail || "no-reply@unibaazar.com",
    cus_phone: order.customerPhone,
    cus_add1: order.customerAddress,
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "Courier",
    product_name: "UniBaazar order",
    product_category: "General",
    product_profile: "general",
  });
  const response = await fetch(`${configured.baseUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json().catch(() => null)) as SessionResponse | null;
  if (!payload || payload.status !== "SUCCESS" || !payload.GatewayPageURL) {
    throw new Error(payload?.failedreason || "SSLCommerz session could not be created");
  }
  return {
    kind: "redirect",
    redirectUrl: payload.GatewayPageURL,
    gatewayRef: payload.sessionkey ?? order.orderNumber,
    raw: payload,
  };
}

async function verifyIPN(fields: Record<string, string>): Promise<PaymentIpnResult> {
  const configured = config();
  const transactionId = fields.tran_id ?? "";
  if (!configured || !fields.val_id) {
    return {
      valid: false,
      gatewayRef: fields.val_id ?? "",
      transactionId,
      status: "FAILED",
      raw: fields,
    };
  }
  const query = new URLSearchParams({
    val_id: fields.val_id,
    store_id: configured.storeId,
    store_passwd: configured.storePass,
    format: "json",
  });
  const response = await fetch(
    `${configured.baseUrl}/validator/api/validationserverAPI.php?${query.toString()}`,
  );
  const payload = (await response.json().catch(() => null)) as ValidatorResponse | null;
  const valid = payload?.status === "VALID" || payload?.status === "VALIDATED";
  return {
    valid,
    gatewayRef: fields.val_id,
    transactionId: payload?.tran_id || transactionId,
    status: valid ? "PAID" : "FAILED",
    amount: payload?.amount ? Number(payload.amount) : undefined,
    raw: payload,
  };
}

export const sslcommerzProvider: PaymentProvider = {
  id: "sslcommerz",
  initiate,
  verifyIPN,
};
