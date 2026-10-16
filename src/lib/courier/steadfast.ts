import { loadIntegrations } from "@/server/settings/store";
import { loadSecret } from "@/server/settings/secret";
import type { BookableOrder, CourierBooking, CourierProvider } from "./types";

type SteadfastPayload = {
  message?: string;
  consignment?: {
    consignment_id?: number | string;
    tracking_code?: string;
    status?: string;
  };
  delivery_status?: string;
};

async function keys(): Promise<{ apiKey: string; secret: string } | null> {
  const [secretKey, integrations] = await Promise.all([
    loadSecret("secret.courier"),
    loadIntegrations(),
  ]);
  const apiKey = integrations.courierUser || process.env.STEADFAST_API_KEY || "";
  const secret = secretKey || process.env.STEADFAST_SECRET_KEY || "";
  if (!apiKey || !secret) {
    return null;
  }
  return { apiKey, secret };
}

async function book(order: BookableOrder): Promise<CourierBooking> {
  const configured = await keys();
  const fallbackTracking = order.trackingId || `SF${order.number.replace(/\D/g, "")}BD`;
  if (!configured) {
    return {
      consignmentId: `LOCAL-${order.number}`,
      trackingCode: fallbackTracking,
      message: `Stored consignment LOCAL-${order.number}. Add Steadfast API keys to book it with the courier.`,
    };
  }
  const cod = order.paymentMethod === "COD" ? order.total.toNumber() : 0;
  const response = await fetch("https://portal.packzy.com/api/v1/create_order", {
    method: "POST",
    headers: {
      "Api-Key": configured.apiKey,
      "Secret-Key": configured.secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice: order.number,
      recipient_name: order.name,
      recipient_phone: order.phone,
      recipient_address: order.addressLine,
      cod_amount: cod,
      note: order.customerNote ?? "",
    }),
  });
  const payload = (await response.json().catch(() => null)) as SteadfastPayload | null;
  const consignmentId = payload?.consignment?.consignment_id;
  if (!response.ok || consignmentId === undefined) {
    throw new Error(payload?.message || "Steadfast did not accept the order");
  }
  return {
    consignmentId: String(consignmentId),
    trackingCode: payload?.consignment?.tracking_code || fallbackTracking,
    message: `Steadfast consignment ${String(consignmentId)}.`,
  };
}

async function status(consignmentId: string): Promise<string | null> {
  const configured = await keys();
  if (!configured || consignmentId.startsWith("LOCAL-")) {
    return null;
  }
  const response = await fetch(
    `https://portal.packzy.com/api/v1/status_by_cid/${encodeURIComponent(consignmentId)}`,
    {
      headers: {
        "Api-Key": configured.apiKey,
        "Secret-Key": configured.secret,
      },
    },
  );
  const payload = (await response.json().catch(() => null)) as SteadfastPayload | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Steadfast status check failed");
  }
  return payload?.delivery_status || payload?.consignment?.status || null;
}

export const steadfastProvider: CourierProvider = { id: "steadfast", book, status };
