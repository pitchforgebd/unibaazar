import { prisma } from "@/lib/db";
import { ApiError } from "@/server/http";
import {
  decideFraud,
  lineSignature,
  type CourierRatio,
} from "@/server/security/fraud-rules";

const deviceHits = new Map<string, number[]>();

function startOfDhakaDay(now = new Date()): Date {
  const offsetMs = 6 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMs);
}

function orderSignature(items: { variantId: string | null; qty: number }[]): string {
  return lineSignature(
    items.flatMap((item) =>
      item.variantId ? [{ variantId: item.variantId, qty: item.qty }] : [],
    ),
  );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function blocked(key: string): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return stringList(row?.value);
}

async function courierRatio(phone: string): Promise<CourierRatio | null> {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!apiKey || !secret) {
    return null;
  }
  try {
    const response = await fetch(
      `https://portal.packzy.com/api/v1/fraud_check/${phone}`,
      {
        headers: { "Api-Key": apiKey, "Secret-Key": secret },
        signal: AbortSignal.timeout(4000),
      },
    );
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return null;
    }
    const record = payload as Record<string, unknown>;
    const total = Number(record.total);
    const success = Number(record.success ?? record.delivered);
    if (!Number.isFinite(total) || !Number.isFinite(success)) {
      return null;
    }
    return { total, success };
  } catch {
    return null;
  }
}

export function noteDeviceOrder(device: string, now = Date.now()): void {
  const start = startOfDhakaDay(new Date(now)).getTime();
  const hits = (deviceHits.get(device) ?? []).filter((hit) => hit >= start);
  hits.push(now);
  deviceHits.set(device, hits);
}

export function deviceOrdersToday(device: string, now = Date.now()): number {
  const start = startOfDhakaDay(new Date(now)).getTime();
  return (deviceHits.get(device) ?? []).filter((hit) => hit >= start).length;
}

export async function assertCheckoutAllowed(input: {
  phone: string;
  ip: string;
  device: string;
  lines: { variantId: string; qty: number }[];
  blacklistedPhone: boolean;
}): Promise<void> {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const signature = lineSignature(input.lines);
  const [
    recent,
    cancelledOrders,
    deliveredOrders,
    ordersFromIpToday,
    blockedPhones,
    blockedIps,
    courier,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        phone: input.phone,
        placedAt: { gte: since },
        status: { not: "CANCELLED" },
      },
      include: { items: true },
    }),
    prisma.order.count({ where: { phone: input.phone, status: "CANCELLED" } }),
    prisma.order.count({ where: { phone: input.phone, status: "DELIVERED" } }),
    prisma.order.count({
      where: { ipAddress: input.ip, placedAt: { gte: startOfDhakaDay() } },
    }),
    blocked("security.blockedPhones"),
    blocked("security.blockedIps"),
    courierRatio(input.phone),
  ]);
  const message = decideFraud({
    blacklistedPhone: input.blacklistedPhone || blockedPhones.includes(input.phone),
    blacklistedIp: blockedIps.includes(input.ip),
    recentDuplicate: recent.some((order) => orderSignature(order.items) === signature),
    cancelledOrders,
    deliveredOrders,
    ordersFromIpToday,
    ordersFromDeviceToday: deviceOrdersToday(input.device),
    courier,
  });
  if (message) {
    throw new ApiError(403, message);
  }
}
