import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { isStaffRole } from "@/server/security/permissions";

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SENT_TO_COURIER",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "FAILED",
  "ON_HOLD",
  "PARTIAL_DELIVERED",
  "REFUNDED",
];

export type DashboardOrder = {
  number: string;
  name: string;
  total: number;
  status: string;
  placedAt: string;
};

export type DashboardData = {
  sales: { label: string; total: number; orders: number }[];
  statuses: { status: string; count: number }[];
  chart: { label: string; total: number }[];
  topProducts: { name: string; sku: string; qty: number; total: number }[];
  lowStock: { name: string; sku: string; stock: number }[];
  newCustomers: { count: number; names: string[] };
  pending: DashboardOrder[];
  recent: DashboardOrder[];
  courierRate: number | null;
  purchaseEvents: number;
};

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, 6)));
}

function placedLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
    hourCycle: "h23",
  }).format(date);
}

function startOfDhakaDay(now = new Date()): Date {
  const key = dayKey(now);
  return new Date(`${key}T00:00:00+06:00`);
}

async function salesSince(from: Date): Promise<{ total: number; orders: number }> {
  const row = await prisma.order.aggregate({
    where: { placedAt: { gte: from }, status: { not: "CANCELLED" } },
    _sum: { total: true },
    _count: true,
  });
  return { total: row._sum.total?.toNumber() ?? 0, orders: row._count };
}

export async function loadDashboard(): Promise<DashboardData> {
  const session = await readSession();
  if (!session || !isStaffRole(session.role)) {
    throw new ApiError(403, "This area is for staff");
  }

  const today = startOfDhakaDay();
  const week = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const month = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const keys = Array.from({ length: 7 }, (_, index) =>
    dayKey(new Date(week.getTime() + index * 24 * 60 * 60 * 1000)),
  );

  const [
    todaySales,
    weekSales,
    monthSales,
    statusRows,
    weekOrders,
    topRows,
    variants,
    customers,
    pendingRows,
    recentRows,
    purchases,
  ] = await Promise.all([
    salesSince(today),
    salesSince(week),
    salesSince(month),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.findMany({
      where: { placedAt: { gte: week }, status: { not: "CANCELLED" } },
      select: { placedAt: true, total: true },
    }),
    prisma.orderItem.groupBy({
      by: ["sku"],
      _sum: { qty: true, lineTotal: true },
      _max: { name: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { status: "ACTIVE" },
      select: {
        sku: true,
        stock: true,
        product: { select: { name: true, lowStockThreshold: true } },
      },
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: week } },
      orderBy: { createdAt: "desc" },
      select: { name: true },
    }),
    prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { placedAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({ orderBy: { placedAt: "desc" }, take: 8 }),
    prisma.trackingEvent.count({ where: { name: "purchase", createdAt: { gte: week } } }),
  ]);

  const counts = new Map(statusRows.map((row) => [row.status, row._count._all]));
  const delivered = counts.get("DELIVERED") ?? 0;
  const closed = delivered + (counts.get("CANCELLED") ?? 0);
  const totals = new Map(keys.map((key) => [key, 0]));
  for (const order of weekOrders) {
    const key = dayKey(order.placedAt);
    totals.set(key, (totals.get(key) ?? 0) + order.total.toNumber());
  }

  const toOrder = (order: {
    number: string;
    name: string;
    total: { toNumber(): number };
    status: string;
    placedAt: Date;
  }): DashboardOrder => ({
    number: order.number,
    name: order.name,
    total: order.total.toNumber(),
    status: order.status,
    placedAt: placedLabel(order.placedAt),
  });

  return {
    sales: [
      { label: "Today", ...todaySales },
      { label: "7 days", ...weekSales },
      { label: "30 days", ...monthSales },
    ],
    statuses: statuses.map((status) => ({ status, count: counts.get(status) ?? 0 })),
    chart: keys.map((key) => ({
      label: dayLabel(key),
      total: Math.round(totals.get(key) ?? 0),
    })),
    topProducts: topRows.map((row) => ({
      name: row._max.name ?? row.sku,
      sku: row.sku,
      qty: row._sum.qty ?? 0,
      total: row._sum.lineTotal?.toNumber() ?? 0,
    })),
    lowStock: variants
      .filter((variant) => variant.stock <= variant.product.lowStockThreshold)
      .sort((left, right) => left.stock - right.stock)
      .slice(0, 8)
      .map((variant) => ({
        name: variant.product.name,
        sku: variant.sku,
        stock: variant.stock,
      })),
    newCustomers: {
      count: customers.length,
      names: customers.slice(0, 5).map((customer) => customer.name),
    },
    pending: pendingRows.map(toOrder),
    recent: recentRows.map(toOrder),
    courierRate: closed === 0 ? null : Math.round((delivered / closed) * 100),
    purchaseEvents: purchases,
  };
}
