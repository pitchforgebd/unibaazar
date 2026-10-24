import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { sendSms } from "@/lib/sms/send";
import { templateSchema } from "@/lib/validation/admin-orders";
import { formatTaka } from "@/lib/utils/currency";
import { siteOrigin } from "@/server/tracking/config";

const settingKey = "notify.orderStatus";

export type NotifyTemplates = {
  sms: string;
  emailSubject: string;
  emailBody: string;
};

export const defaults: NotifyTemplates = {
  sms: "Hi {name}, UniBaazar order {order_id} is {status}. Total {total}. Tracking {tracking}.",
  emailSubject: "Order {order_id} is {status}",
  emailBody:
    "Hello {name},\n\nYour UniBaazar order {order_id} is now {status}.\nTotal: {total}\nTracking: {tracking}\n",
};

function isTemplates(value: unknown): value is NotifyTemplates {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.sms === "string" &&
    typeof row.emailSubject === "string" &&
    typeof row.emailBody === "string"
  );
}

export async function loadNotifyTemplates(): Promise<NotifyTemplates> {
  const row = await prisma.setting.findUnique({ where: { key: settingKey } });
  return isTemplates(row?.value) ? row.value : defaults;
}

export async function saveNotifyTemplates(input: NotifyTemplates): Promise<void> {
  const parsed = templateSchema.parse(input);
  await prisma.setting.upsert({
    where: { key: settingKey },
    update: { value: parsed as Prisma.InputJsonValue },
    create: { key: settingKey, value: parsed as Prisma.InputJsonValue },
  });
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (_match, key: string) => values[key] ?? "");
}

export async function queueStatusNotice(order: {
  id: string;
  number: string;
  name: string;
  phone: string;
  email: string | null;
  total: { toNumber(): number };
  trackingId: string | null;
  status: string;
}): Promise<void> {
  const templates = await loadNotifyTemplates();
  const values = {
    name: order.name,
    order_id: order.number,
    status: order.status.replace(/_/g, " ").toLowerCase(),
    total: formatTaka(order.total.toNumber()),
    tracking: order.trackingId ?? "",
  };
  // Keyed on (order, status): a genuine race between two concurrent
  // status-change requests landing on the same order before either
  // commits could otherwise both pass transition-legality checks and
  // both notify — this is the backstop, not the primary guard (that's
  // transitionOrder()'s own same-status no-op in the common case).
  const dedupeKey = `order-status:${order.id}:${order.status}`;
  const sms = fillTemplate(templates.sms, values);
  await sendSms(order.phone, sms, { orderId: order.id }, dedupeKey);
  if (order.email) {
    const trackUrl = `${siteOrigin()}/track-order?order=${encodeURIComponent(order.number)}&phone=${encodeURIComponent(order.phone)}`;
    await sendEmail(
      order.email,
      fillTemplate(templates.emailSubject, values),
      fillTemplate(templates.emailBody, values),
      dedupeKey,
      { label: "Track your order", href: trackUrl },
    );
  }
}
