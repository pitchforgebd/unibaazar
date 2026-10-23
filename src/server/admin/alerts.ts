import { prisma } from "@/lib/db";
import { isStaffRole, staffRoleSlugs } from "@/server/security/permissions";
import { loadAlertSettings, type AlertSettings } from "@/server/settings/alerts";
import { loadSecret } from "@/server/settings/secret";
import { normalizeBdPhone } from "@/lib/validation/customer";

async function staffUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { slug: { in: [...staffRoleSlugs] } },
    },
    select: { id: true, role: { select: { slug: true } } },
  });
  return rows.filter((row) => isStaffRole(row.role.slug)).map((row) => row.id);
}

async function createInApp(input: {
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  const userIds = await staffUserIds();
  const base = {
    channel: "IN_APP" as const,
    title: input.title,
    body: input.body,
  };
  const withHref = { ...base, href: input.href ?? null };
  async function write(userId: string | null): Promise<void> {
    try {
      await prisma.notification.create({
        data: userId ? { ...withHref, userId } : withHref,
      });
    } catch {
      await prisma.notification.create({
        data: userId ? { ...base, userId } : base,
      });
    }
  }
  if (userIds.length === 0) {
    await write(null);
    return;
  }
  for (const userId of userIds) {
    await write(userId);
  }
}

async function queueEmail(to: string, subject: string, body: string): Promise<void> {
  if (!to.trim()) {
    return;
  }
  await prisma.emailLog.create({
    data: {
      to: to.trim().slice(0, 191),
      subject: subject.slice(0, 191),
      body,
      status: "queued",
    },
  });
}

async function queueSms(to: string, body: string, provider: string): Promise<void> {
  const phone = normalizeBdPhone(to) ?? to.trim();
  if (!phone) {
    return;
  }
  await prisma.smsLog.create({
    data: {
      to: phone.slice(0, 20),
      body,
      provider: provider.slice(0, 32),
      status: "queued",
    },
  });
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = await loadSecret("secret.telegram");
  if (!token || !chatId.trim()) {
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId.trim(), text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // optional channel — ignore network failures
  }
}

async function deliverExternal(
  settings: AlertSettings,
  title: string,
  body: string,
): Promise<void> {
  const text = `${title}\n${body}`;
  if (settings.email) {
    await queueEmail(settings.adminEmail, title, body);
  }
  if (settings.sms) {
    await queueSms(settings.adminPhone, text.slice(0, 300), "admin-alert");
  }
  if (settings.whatsapp) {
    await queueSms(
      settings.whatsappPhone || settings.adminPhone,
      text.slice(0, 300),
      "whatsapp",
    );
  }
  if (settings.telegram) {
    await sendTelegram(settings.telegramChatId, text);
  }
}

export async function alertNewOrder(order: {
  id: string;
  number: string;
  name: string;
  phone: string;
  total: number;
}): Promise<void> {
  const settings = await loadAlertSettings();
  const title = `New order ${order.number}`;
  const body = `${order.name} · ${order.phone} · ৳${Math.round(order.total).toLocaleString("en-BD")}`;
  const href = `/admin/orders/${order.id}`;
  if (settings.inApp) {
    await createInApp({ title, body, href });
  }
  await deliverExternal(settings, title, body);
}

export async function alertContactMessage(input: {
  name: string;
  phone: string;
  email: string;
  message: string;
}): Promise<void> {
  const settings = await loadAlertSettings();
  const title = `New contact message from ${input.name}`;
  const body = `${input.phone}${input.email ? ` · ${input.email}` : ""}\n${input.message}`;
  if (settings.inApp) {
    await createInApp({ title, body });
  }
  await deliverExternal(settings, title, body);
}

export async function alertLowStock(input: {
  sku: string;
  name: string;
  stock: number;
  threshold: number;
  productId?: string;
}): Promise<void> {
  const settings = await loadAlertSettings();
  if (!settings.lowStock) {
    return;
  }
  const title = `Low stock · ${input.sku}`;
  const body = `${input.name} has ${input.stock} left (threshold ${input.threshold}).`;
  const href = input.productId
    ? `/admin/products/${input.productId}`
    : "/admin/inventory";
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recent = await prisma.notification.findFirst({
    where: {
      channel: "IN_APP",
      title,
      createdAt: { gte: since },
    },
  });
  if (recent) {
    return;
  }
  if (settings.inApp) {
    await createInApp({ title, body, href });
  }
  await deliverExternal(settings, title, body);
}

/** Daily payment-reconciliation mismatches — reuses the general in-app/
 * external-channel toggles rather than a dedicated settings category,
 * since this runs once a day (no dedup window needed, unlike low-stock
 * which can re-trigger on every order) and a payment discrepancy is
 * already as urgent as anything else these channels carry. */
export async function alertPaymentMismatch(count: number): Promise<void> {
  const settings = await loadAlertSettings();
  const title = `Payment reconciliation: ${count} mismatch(es)`;
  const body = `The daily payment reconciliation job found ${count} payment(s) that need a look. See Admin → Maintenance → Reconcile payments for details.`;
  if (settings.inApp) {
    await createInApp({ title, body, href: "/admin/maintenance" });
  }
  await deliverExternal(settings, title, body);
}

export async function checkVariantsLowStock(variantIds: string[]): Promise<void> {
  if (variantIds.length === 0) {
    return;
  }
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { id: true, name: true, lowStockThreshold: true } } },
  });
  for (const variant of variants) {
    if (variant.stock <= variant.product.lowStockThreshold) {
      await alertLowStock({
        sku: variant.sku,
        name: variant.product.name,
        stock: variant.stock,
        threshold: variant.product.lowStockThreshold,
        productId: variant.product.id,
      });
    }
  }
}

export async function listStaffNotifications(userId: string, limit = 30) {
  const rows = await prisma.notification.findMany({
    where: {
      channel: "IN_APP",
      OR: [{ userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unread = rows.filter((row) => !row.readAt).length;
  return {
    unread,
    sound: (await loadAlertSettings()).sound,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      href: "href" in row ? ((row as { href?: string | null }).href ?? null) : null,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markNotificationsRead(
  userId: string,
  ids?: string[],
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      channel: "IN_APP",
      readAt: null,
      OR: [{ userId }, { userId: null }],
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      channel: "IN_APP",
      readAt: null,
      OR: [{ userId }, { userId: null }],
    },
  });
}
