import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TRACKING_CURRENCY, type TrackItem } from "@/lib/tracking/ecommerce";
import type { TrackName } from "@/lib/tracking/names";
import {
  metaEvent,
  tiktokEvent,
  type ServerEvent,
  type ServerEventUser,
} from "@/server/tracking/capi";
import {
  loadTracking,
  metaAccessToken,
  siteOrigin,
  tiktokAccessToken,
} from "@/server/tracking/config";

const MAX_CONVERSION_ATTEMPTS = 5;
const CONVERSION_LOG_DAYS = 30;
// Checkout waits on the Purchase send, so a slow platform API mustn't hold it.
const SEND_TIMEOUT_MS = 5000;

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
      error = await failureReason(response);
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

/** Keeps the platform's own explanation, which is what an admin needs to fix it. */
async function failureReason(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return `HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`;
}

function postToMeta(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${endpoint}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

function postToTiktok(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "Access-Token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

/** Sends one event to every platform that has both a pixel id and a token saved. */
export async function sendServerEvent(
  event: ServerEvent,
  orderId?: string,
): Promise<void> {
  const [tracking, metaToken, tiktokToken] = await Promise.all([
    loadTracking(),
    metaAccessToken(),
    tiktokAccessToken(),
  ]);
  const meta = tracking.metaPixelId && metaToken ? metaEvent(event) : null;
  if (meta) {
    const body = {
      data: [meta],
      ...(tracking.metaTestCode ? { test_event_code: tracking.metaTestCode } : {}),
    };
    const endpoint = `https://graph.facebook.com/v21.0/${tracking.metaPixelId}/events`;
    await sendConversionEvent({
      provider: "meta",
      eventName: event.name,
      eventKey: event.eventId,
      orderId: orderId ?? null,
      endpoint,
      body,
      send: () => postToMeta(endpoint, metaToken, body),
    });
  }
  const tiktok = tracking.tiktokPixelId && tiktokToken ? tiktokEvent(event) : null;
  if (tiktok) {
    const endpoint = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
    const body = {
      event_source: "web",
      event_source_id: tracking.tiktokPixelId,
      data: [tiktok],
      ...(tracking.tiktokTestCode ? { test_event_code: tracking.tiktokTestCode } : {}),
    };
    await sendConversionEvent({
      provider: "tiktok",
      eventName: event.name,
      eventKey: event.eventId,
      orderId: orderId ?? null,
      endpoint,
      body,
      send: () => postToTiktok(endpoint, tiktokToken, body),
    });
  }
}

export async function signalPurchase(input: {
  eventId: string;
  value: number;
  currency: string;
  orderId?: string;
  items: TrackItem[];
  user: ServerEventUser;
}): Promise<void> {
  await recordTrackEvent({
    name: "Purchase",
    eventId: input.eventId,
    source: "server",
    orderNumber: input.eventId,
    payload: { value: input.value, currency: input.currency },
  });
  await sendServerEvent(
    {
      name: "Purchase",
      eventId: input.eventId,
      url: `${siteOrigin()}/order-success/${input.eventId}`,
      data: {
        value: input.value,
        currency: input.currency,
        transactionId: input.eventId,
        items: input.items,
      },
      user: input.user,
    },
    input.orderId,
  );
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
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentMethod === "COD") {
    return;
  }
  await signalPurchase({
    eventId: order.number,
    orderId: order.id,
    value: order.total.toNumber(),
    currency: TRACKING_CURRENCY,
    items: order.items.map((item) => ({
      id: item.sku,
      name: item.name,
      price: item.unitPrice.toNumber(),
      quantity: item.qty,
    })),
    user: {
      phone: order.phone,
      email: order.email ?? "",
      ip: order.ipAddress ?? undefined,
      userAgent: order.userAgent ?? undefined,
      fbp: order.fbp,
      fbc: order.fbc,
      ttp: order.ttp,
      ttclid: order.ttclid,
    },
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
      const token =
        row.provider === "meta" ? await metaAccessToken() : await tiktokAccessToken();
      if (!token) {
        throw new Error(`No ${row.provider} token configured`);
      }
      const response =
        row.provider === "meta"
          ? await postToMeta(row.endpoint, token, body)
          : await postToTiktok(row.endpoint, token, body);
      ok = response.ok;
      if (!ok) {
        error = await failureReason(response);
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
  // Every relayed browser event logs a row, so the table needs a ceiling.
  await prisma.conversionApiLog.deleteMany({
    where: {
      status: "sent",
      createdAt: { lt: new Date(Date.now() - CONVERSION_LOG_DAYS * 24 * 60 * 60 * 1000) },
    },
  });
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
