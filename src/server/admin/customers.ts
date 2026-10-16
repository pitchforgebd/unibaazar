import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toCsv } from "@/server/admin/csv";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { recordAudit } from "@/server/security/audit";

const pageSize = 20;

export type CustomerListQuery = {
  q: string;
  blocked: string;
  tag: string;
  page: number;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  blocked: boolean;
  tags: string[];
  orders: number;
  lifetimeValue: number;
  joined: string;
};

export type CustomerAddressRow = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  area: "INSIDE_DHAKA" | "OUTSIDE_DHAKA";
  city: string;
  isDefault: boolean;
};

export type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  blocked: boolean;
  notes: string;
  tags: string[];
  joined: string;
  lifetimeValue: number;
  orderCount: number;
  addresses: CustomerAddressRow[];
  orderAddresses: { line: string; area: string }[];
  orders: {
    id: string;
    number: string;
    total: number;
    status: string;
    placedAt: string;
  }[];
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function stamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(",")) {
    const raw = part.trim();
    if (!raw) {
      continue;
    }
    const tag = raw.toLowerCase().replace(/\s+/g, "-");
    if (!/^[a-z0-9-]{1,32}$/.test(tag)) {
      throw new Error("Tags use letters, numbers, and hyphens");
    }
    if (seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    tags.push(tag);
    if (tags.length === 12) {
      break;
    }
  }
  return tags;
}

export function readTags(stored: string): string[] {
  return stored
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagWhere(tag: string): Prisma.CustomerWhereInput {
  return {
    OR: [
      { tags: tag },
      { tags: { startsWith: `${tag},` } },
      { tags: { endsWith: `,${tag}` } },
      { tags: { contains: `,${tag},` } },
    ],
  };
}

function listWhere(query: CustomerListQuery): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  const and: Prisma.CustomerWhereInput[] = [];
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q } },
        { phone: { contains: query.q } },
        { email: { contains: query.q } },
      ],
    });
  }
  if (query.blocked === "blocked") {
    where.isBlacklisted = true;
  } else if (query.blocked === "open") {
    where.isBlacklisted = false;
  }
  if (query.tag && /^[a-z0-9-]{1,32}$/.test(query.tag)) {
    and.push(tagWhere(query.tag));
  }
  if (and.length > 0) {
    where.AND = and;
  }
  return where;
}

export function parseCustomerListQuery(
  params: Record<string, string | string[] | undefined>,
): CustomerListQuery {
  const page = Number(one(params.page));
  return {
    q: one(params.q).trim(),
    blocked: one(params.blocked),
    tag: one(params.tag).trim().toLowerCase(),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

async function totalsFor(ids: string[]): Promise<{
  orders: Map<string, number>;
  value: Map<string, number>;
}> {
  if (ids.length === 0) {
    return { orders: new Map(), value: new Map() };
  }
  const [counts, values] = await Promise.all([
    prisma.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids } },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
  ]);
  return {
    orders: new Map(
      counts.flatMap((row) =>
        row.customerId ? [[row.customerId, row._count] as const] : [],
      ),
    ),
    value: new Map(
      values.flatMap((row) =>
        row.customerId
          ? [[row.customerId, row._sum.total?.toNumber() ?? 0] as const]
          : [],
      ),
    ),
  };
}

export async function listCustomers(query: CustomerListQuery): Promise<{
  rows: CustomerRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const where = listWhere(query);
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const totals = await totalsFor(customers.map((customer) => customer.id));
  return {
    total,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    rows: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      blocked: customer.isBlacklisted,
      tags: readTags(customer.tags),
      orders: totals.orders.get(customer.id) ?? 0,
      lifetimeValue: totals.value.get(customer.id) ?? 0,
      joined: stamp(customer.createdAt),
    })),
  };
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: { orderBy: { placedAt: "desc" }, take: 50 },
    },
  });
  if (!customer) {
    return null;
  }
  const totals = await totalsFor([customer.id]);
  const saved = new Set(
    customer.addresses.map((address) => address.line1.trim().toLowerCase()),
  );
  const orderAddresses: { line: string; area: string }[] = [];
  for (const order of customer.orders) {
    const line = order.addressLine.trim();
    if (!line || saved.has(line.toLowerCase())) {
      continue;
    }
    if (orderAddresses.some((item) => item.line.toLowerCase() === line.toLowerCase())) {
      continue;
    }
    orderAddresses.push({
      line,
      area: order.area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka",
    });
  }
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    blocked: customer.isBlacklisted,
    notes: customer.notes ?? "",
    tags: readTags(customer.tags),
    joined: stamp(customer.createdAt),
    lifetimeValue: totals.value.get(customer.id) ?? 0,
    orderCount: totals.orders.get(customer.id) ?? customer.orders.length,
    addresses: customer.addresses.map((address) => ({
      id: address.id,
      label: address.label,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      area: address.area,
      city: address.city,
      isDefault: address.isDefault,
    })),
    orderAddresses,
    orders: customer.orders.map((order) => ({
      id: order.id,
      number: order.number,
      total: order.total.toNumber(),
      status: order.status,
      placedAt: stamp(order.placedAt),
    })),
  };
}

export async function saveCustomerProfile(
  actorId: string,
  customerId: string,
  notes: string,
  tagsInput: string,
): Promise<void> {
  const tags = parseTags(tagsInput);
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { notes: notes.trim() || null, tags: tags.join(",") },
  });
  await recordAudit({
    actorId,
    action: "customer.profile",
    entityType: "Customer",
    entityId: customer.id,
    metadata: { tags },
  });
}

export async function setCustomerBlocked(
  actorId: string,
  customerId: string,
  blocked: boolean,
): Promise<void> {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { isBlacklisted: blocked },
  });
  await recordAudit({
    actorId,
    action: blocked ? "customer.block" : "customer.unblock",
    entityType: "Customer",
    entityId: customer.id,
  });
}

export async function addCustomerAddress(
  actorId: string,
  input: {
    customerId: string;
    name: string;
    phone: string;
    line1: string;
    area: "INSIDE_DHAKA" | "OUTSIDE_DHAKA";
    city: string;
    label: "HOME" | "OFFICE" | "OTHER";
    isDefault: boolean;
  },
): Promise<void> {
  const phone = normalizeBdPhone(input.phone);
  if (!phone) {
    throw new Error("Enter a valid Bangladeshi mobile number");
  }
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new Error("Customer not found");
  }
  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }
    await tx.address.create({
      data: {
        customerId: customer.id,
        userId: customer.userId,
        label: input.label,
        name: input.name,
        phone,
        line1: input.line1,
        area: input.area,
        city: input.city,
        isDefault: input.isDefault,
      },
    });
  });
  await recordAudit({
    actorId,
    action: "customer.address",
    entityType: "Customer",
    entityId: customer.id,
  });
}

export async function removeCustomerAddress(
  actorId: string,
  customerId: string,
  addressId: string,
): Promise<void> {
  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });
  if (!address) {
    throw new Error("Address not found");
  }
  await prisma.address.delete({ where: { id: address.id } });
  await recordAudit({
    actorId,
    action: "customer.address.delete",
    entityType: "Customer",
    entityId: customerId,
    metadata: { addressId },
  });
}

export async function exportCustomersCsv(query: CustomerListQuery): Promise<string> {
  const customers = await prisma.customer.findMany({
    where: listWhere(query),
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const totals = await totalsFor(customers.map((customer) => customer.id));
  const rows = [
    ["name", "phone", "email", "blocked", "tags", "orders", "lifetimeValue", "joined"],
    ...customers.map((customer) => [
      customer.name,
      customer.phone,
      customer.email ?? "",
      customer.isBlacklisted ? "yes" : "no",
      readTags(customer.tags).join("|"),
      String(totals.orders.get(customer.id) ?? 0),
      String(totals.value.get(customer.id) ?? 0),
      customer.createdAt.toISOString(),
    ]),
  ];
  return toCsv(rows);
}
