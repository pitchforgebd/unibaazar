import { prisma } from "@/lib/db";
import { loadSecret } from "@/server/settings/secret";
import { saveSetting } from "@/server/settings/store";
import { recordAudit } from "@/server/security/audit";
import { setOrderStatus, shipmentStatusFrom } from "@/server/admin/orders-admin";

const TOKEN_KEY = "secret.courierWebhookToken";
const PROVIDER = "steadfast";
const HEALTH_WINDOW = 20;

export async function loadCourierWebhookToken(): Promise<string> {
  return loadSecret(TOKEN_KEY);
}

export async function saveCourierWebhookToken(
  actorId: string,
  token: string,
): Promise<void> {
  await saveSetting(TOKEN_KEY, token.trim(), true);
  await recordAudit({
    actorId,
    action: "settings.courier.webhookToken",
    entityType: "Setting",
    entityId: TOKEN_KEY,
  });
}

export function generateWebhookToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export type WebhookHealth = {
  status: "unconfigured" | "healthy" | "failing";
  consecutiveFailures: number;
  lastStatusCode: number | null;
  lastAt: string | null;
  lastMessage: string | null;
};

export async function loadCourierWebhookHealth(): Promise<WebhookHealth> {
  const token = await loadCourierWebhookToken();
  const recent = await prisma.courierWebhookLog.findMany({
    where: { provider: PROVIDER },
    orderBy: { createdAt: "desc" },
    take: HEALTH_WINDOW,
  });
  if (!token) {
    return {
      status: "unconfigured",
      consecutiveFailures: 0,
      lastStatusCode: null,
      lastAt: null,
      lastMessage: null,
    };
  }
  let consecutiveFailures = 0;
  for (const row of recent) {
    if (row.success) {
      break;
    }
    consecutiveFailures += 1;
  }
  const last = recent[0] ?? null;
  return {
    status: consecutiveFailures >= 3 ? "failing" : "healthy",
    consecutiveFailures,
    lastStatusCode: last?.statusCode ?? null,
    lastAt: last?.createdAt.toISOString() ?? null,
    lastMessage: last?.message ?? null,
  };
}

export async function resetCourierWebhookHealth(actorId: string): Promise<string> {
  await prisma.courierWebhookLog.deleteMany({ where: { provider: PROVIDER } });
  await recordAudit({
    actorId,
    action: "settings.courier.webhookReset",
    entityType: "Setting",
    entityId: TOKEN_KEY,
  });
  return "Delivery health reset.";
}

async function logDelivery(
  success: boolean,
  statusCode: number,
  message: string,
  payload: unknown,
): Promise<void> {
  await prisma.courierWebhookLog.create({
    data: {
      provider: PROVIDER,
      success,
      statusCode,
      message: message.slice(0, 500),
      payload: payload as never,
    },
  });
}

function firstString(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

export async function verifyWebhookToken(authorization: string | null): Promise<boolean> {
  const configured = await loadCourierWebhookToken();
  if (!configured) {
    return false;
  }
  const presented = authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
  return presented.length > 0 && presented === configured;
}

export async function handleSteadfastWebhook(
  rawPayload: unknown,
): Promise<{ statusCode: number; message: string }> {
  const payload =
    typeof rawPayload === "object" && rawPayload !== null
      ? (rawPayload as Record<string, unknown>)
      : {};
  const consignmentId = firstString(payload, ["consignment_id", "cid", "id"]);
  const invoice = firstString(payload, ["invoice", "invoice_id", "order_id"]);
  const trackingCode = firstString(payload, ["tracking_code", "tracking_id"]);
  const statusText = firstString(payload, [
    "status",
    "delivery_status",
    "notification_type",
  ]);

  if (!consignmentId && !invoice && !trackingCode) {
    await logDelivery(false, 400, "Missing order identifiers", payload);
    return { statusCode: 400, message: "No consignment id, invoice, or tracking code" };
  }
  if (!statusText) {
    await logDelivery(false, 400, "Missing status", payload);
    return { statusCode: 400, message: "No status in payload" };
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        consignmentId ? { consignmentId } : undefined,
        invoice ? { order: { number: invoice } } : undefined,
        trackingCode ? { order: { trackingId: trackingCode } } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
    },
    include: { order: true },
  });
  if (!shipment) {
    await logDelivery(
      false,
      404,
      `No shipment matched ${consignmentId || invoice || trackingCode}`,
      payload,
    );
    return { statusCode: 404, message: "No matching shipment" };
  }

  const mapped = shipmentStatusFrom(statusText);
  if (mapped) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: mapped },
    });
  }
  if (
    mapped === "DELIVERED" &&
    shipment.order.status !== "COMPLETED" &&
    shipment.order.status !== "DELIVERED"
  ) {
    await setOrderStatus(
      null,
      shipment.orderId,
      "DELIVERED",
      `Steadfast webhook: ${statusText}`,
    );
  }

  await logDelivery(true, 200, `Order ${shipment.order.number}: ${statusText}`, payload);
  return { statusCode: 200, message: "ok" };
}
