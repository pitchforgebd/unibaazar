import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  loadTracking,
  metaAccessToken,
  siteOrigin,
  tiktokAccessToken,
} from "@/server/tracking/config";

export const trackNames = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Search",
  "CompleteRegistration",
  "Lead",
] as const;

export type TrackName = (typeof trackNames)[number];

const MAX_CONVERSION_ATTEMPTS = 5;

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function recordTrackEvent(input: {
  name: TrackName;
  eventId: string;
  source: "browser" | "server";
  payload?: Record<string, string | number>;
  orderNumber?: string;
}): Promise<void> {
  const order = input.orderNumber
    ? await prisma.order.findUnique({
        where: { number: input.orderNumber },
        select: { id: true },
      })
    : null;
  await prisma.trackingEvent.create({
    data: {
      name: input.name,
      orderId: order?.id,
      payload: {
        eventId: input.eventId,
        source: input.source,
        ...(input.payload ?? {}),
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Sends one Conversions API event and logs the attempt — the previous
 * version of this file ended every outbound call in
 * `.catch(() => undefined)`, so a misconfigured/expired token or a
 * transient Graph/TikTok API outage failed with no record and no retry.
 * `endpoint` must not carry the access token/secret (Meta's goes in a
 * query param, TikTok's in a header) — `retryFailedConversions()` below
 * re-derives a fresh one at retry time from admin settings rather than
 * persisting a secret into the log row.
 */
async function sendConversionEvent(input: {
  provider: "meta" | "tiktok";
  eventName: TrackName;
  eventKey: string;
  orderId: string | null;
  endpoint: string;
  body: Record<string, unknown>;
  send: () => Promise<Response>;
}): Promise<void> {
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  try {
    const response = await input.send();
    if (!response.ok) {
      status = "failed";
      error = `HTTP ${response.status}`;
    }
  } catch (caught) {
    status = "failed";
    error = caught instanceof Error ? caught.message : "Network error";
  }
  await prisma.conversionApiLog.create({
    data: {
      provider: input.provider,
      eventName: input.eventName,
      eventKey: input.eventKey,
      orderId: input.orderId,
      endpoint: input.endpoint,
      payload: input.body as Prisma.InputJsonValue,
      status,
      error,
    },
  });
}

export async function signalPurchase(input: {
  eventId: string;
  value: number;
  currency: string;
  phone: string;
  email: string;
  orderId?: string;
  fbp?: string | null;
  fbc?: string | null;
}): Promise<void> {
  await recordTrackEvent({
    name: "Purchase",
    eventId: input.eventId,
    source: "server",
    orderNumber: input.eventId,
    payload: { value: input.value, currency: input.currency },
  });
  const [tracking, metaToken, tiktokToken] = await Promise.all([
    loadTracking(),
    metaAccessToken(),
    tiktokAccessToken(),
  ]);
  if (tracking.metaPixelId && metaToken) {
    const body: Record<string, unknown> = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: "website",
          event_source_url: `${siteOrigin()}/order-success/${input.eventId}`,
          user_data: {
            ph: [sha256(input.phone)],
            ...(input.email ? { em: [sha256(input.email)] } : {}),
            ...(input.fbp ? { fbp: input.fbp } : {}),
            ...(input.fbc ? { fbc: input.fbc } : {}),
          },
          custom_data: { currency: input.currency, value: input.value },
        },
      ],
      ...(tracking.metaTestCode ? { test_event_code: tracking.metaTestCode } : {}),
    };
    const endpoint = `https://graph.facebook.com/v21.0/${tracking.metaPixelId}/events`;
    await sendConversionEvent({
      provider: "meta",
      eventName: "Purchase",
      eventKey: input.eventId,
      orderId: input.orderId ?? null,
      endpoint,
      body,
      send: () =>
        fetch(`${endpoint}?access_token=${encodeURIComponent(metaToken)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
    });
  }
  if (tracking.tiktokPixelId && tiktokToken) {
    const endpoint = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
    const body = {
      event_source: "web",
      event_source_id: tracking.tiktokPixelId,
      data: [
        {
          event: "CompletePayment",
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          user: {
            phone: sha256(input.phone),
            ...(input.email ? { email: sha256(input.email) } : {}),
          },
          properties: { currency: input.currency, value: input.value },
        },
      ],
    };
    await sendConversionEvent({
      provider: "tiktok",
      eventName: "Purchase",
      eventKey: input.eventId,
      orderId: input.orderId ?? null,
      endpoint,
      body,
      send: () =>
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", "Access-Token": tiktokToken },
          body: JSON.stringify(body),
        }),
    });
  }
}

/**
 * Fires the CAPI `Purchase` signal for a payment that just reached
 * `PAID` — the counterpart to `placeOrder()`'s immediate signal for COD,
 * which needs no such wait since the order itself is the commitment.
 * No-ops for COD orders (already signaled at creation) so the two
 * trigger points can't double-fire — see
 * docs/decisions/0020-phase-9-scope-facebook-meta-module.md.
 */
export async function signalPurchaseOnConfirmedPayment(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod === "COD") {
    return;
  }
  await signalPurchase({
    eventId: order.number,
    orderId: order.id,
    value: order.total.toNumber(),
    currency: "BDT",
    phone: order.phone,
    email: order.email ?? "",
    fbp: order.fbp,
    fbc: order.fbc,
  });
}

/**
 * Daily sweep (Admin → Maintenance / cron, same shape as Phase 7's
 * payment reconciliation and Phase 8's abandoned-cart sweep): retries
 * every Conversions API send still marked `failed`, capped at
 * `MAX_CONVERSION_ATTEMPTS` so a permanently broken token doesn't retry
 * forever — a row at the cap stays `failed` for a human to notice via
 * Admin → Tracking's "Recent events" list.
 */
export async function retryFailedConversions(): Promise<{
  retried: number;
  fixed: number;
}> {
  const rows = await prisma.conversionApiLog.findMany({
    where: { status: "failed", attempts: { lt: MAX_CONVERSION_ATTEMPTS } },
  });
  let fixed = 0;
  for (const row of rows) {
    const body = row.payload as Record<string, unknown>;
    let ok = false;
    let error: string | null = null;
    try {
      const response =
        row.provider === "meta"
          ? await (async () => {
              const token = await metaAccessToken();
              if (!token) {
                throw new Error("No Meta CAPI token configured");
              }
              return fetch(`${row.endpoint}?access_token=${encodeURIComponent(token)}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
              });
            })()
          : await (async () => {
              const token = await tiktokAccessToken();
              if (!token) {
                throw new Error("No TikTok events API token configured");
              }
              return fetch(row.endpoint, {
                method: "POST",
                headers: { "content-type": "application/json", "Access-Token": token },
                body: JSON.stringify(body),
              });
            })();
      ok = response.ok;
      if (!ok) {
        error = `HTTP ${response.status}`;
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Network error";
    }
    await prisma.conversionApiLog.update({
      where: { id: row.id },
      data: {
        status: ok ? "sent" : "failed",
        error: ok ? null : error,
        attempts: { increment: 1 },
      },
    });
    if (ok) {
      fixed += 1;
    }
  }
  return { retried: rows.length, fixed };
}

export async function listRecentEvents(): Promise<
  { id: string; name: string; when: string; source: string }[]
> {
  const rows = await prisma.trackingEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return rows.map((row) => {
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? row.payload
        : {};
    const source =
      "source" in payload && typeof payload.source === "string" ? payload.source : "";
    return {
      id: row.id,
      name: row.name,
      when: row.createdAt.toISOString().slice(0, 16).replace("T", " "),
      source,
    };
  });
}

export async function listRecentConversions(): Promise<
  {
    id: string;
    provider: string;
    eventName: string;
    status: string;
    error: string | null;
    attempts: number;
    when: string;
  }[]
> {
  const rows = await prisma.conversionApiLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    eventName: row.eventName,
    status: row.status,
    error: row.error,
    attempts: row.attempts,
    when: row.createdAt.toISOString().slice(0, 16).replace("T", " "),
  }));
}
