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
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Search",
  "CompleteRegistration",
  "Lead",
] as const;

export type TrackName = (typeof trackNames)[number];

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

export async function signalPurchase(input: {
  eventId: string;
  value: number;
  currency: string;
  phone: string;
  email: string;
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
          },
          custom_data: { currency: input.currency, value: input.value },
        },
      ],
    };
    if (tracking.metaTestCode) {
      body.test_event_code = tracking.metaTestCode;
    }
    await fetch(
      `https://graph.facebook.com/v21.0/${tracking.metaPixelId}/events?access_token=${encodeURIComponent(metaToken)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ).catch(() => undefined);
  }
  if (tracking.tiktokPixelId && tiktokToken) {
    await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: { "content-type": "application/json", "Access-Token": tiktokToken },
      body: JSON.stringify({
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
      }),
    }).catch(() => undefined);
  }
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
