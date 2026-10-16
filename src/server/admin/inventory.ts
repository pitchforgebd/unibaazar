import { Prisma, type InventoryReason } from "@prisma/client";
import { prisma } from "@/lib/db";
import { barcodeSvg } from "@/lib/utils/barcode";
import { recordAudit } from "@/server/security/audit";

const pageSize = 20;

export type StockQuery = {
  q: string;
  level: string;
  page: number;
};

export type StockRow = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  stock: number;
  threshold: number;
  level: "out" | "low" | "ok";
};

export type StockList = {
  rows: StockRow[];
  total: number;
  page: number;
  pages: number;
  out: number;
  low: number;
};

export type LedgerRow = {
  id: string;
  sku: string;
  name: string;
  delta: number;
  quantityAfter: number;
  reason: string;
  note: string;
  warehouse: string;
  at: string;
};

export type WarehouseRow = { id: string; code: string; name: string; isDefault: boolean };

export type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  orders: number;
};

export type PurchaseRow = {
  id: string;
  number: string;
  supplier: string;
  status: string;
  lines: number;
  at: string;
};

export type PurchaseDetail = {
  id: string;
  number: string;
  supplier: string;
  status: string;
  notes: string;
  at: string;
  items: { sku: string; name: string; qty: number; cost: number }[];
};

export type LabelSheet = {
  name: string;
  sku: string;
  barcode: string;
  price: number;
  svg: string;
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

function levelFor(stock: number, threshold: number): StockRow["level"] {
  if (stock <= 0) {
    return "out";
  }
  if (stock <= threshold) {
    return "low";
  }
  return "ok";
}

export function parseStockQuery(
  params: Record<string, string | string[] | undefined>,
): StockQuery {
  const page = Number(one(params.page));
  return {
    q: one(params.q).trim(),
    level: one(params.level),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export async function listStock(query: StockQuery): Promise<StockList> {
  const variants = await prisma.productVariant.findMany({
    where: query.q
      ? {
          OR: [
            { sku: { contains: query.q } },
            { product: { name: { contains: query.q } } },
          ],
        }
      : undefined,
    include: { product: { select: { name: true, lowStockThreshold: true } } },
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
  });
  const rows = variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    name: variant.product.name,
    stock: variant.stock,
    threshold: variant.product.lowStockThreshold,
    level: levelFor(variant.stock, variant.product.lowStockThreshold),
  }));
  const filtered =
    query.level === "low" || query.level === "out"
      ? rows.filter((row) => row.level === query.level)
      : rows;
  const start = (query.page - 1) * pageSize;
  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page: query.page,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    out: rows.filter((row) => row.level === "out").length,
    low: rows.filter((row) => row.level === "low").length,
  };
}

export async function listWarehouses(): Promise<WarehouseRow[]> {
  const rows = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isDefault: row.isDefault,
  }));
}

export async function saveWarehouse(
  actorId: string,
  code: string,
  name: string,
): Promise<void> {
  const existing = await prisma.warehouse.count();
  const warehouse = await prisma.warehouse.create({
    data: { code: code.toUpperCase(), name, isDefault: existing === 0 },
  });
  await recordAudit({
    actorId,
    action: "inventory.warehouse",
    entityType: "Warehouse",
    entityId: warehouse.id,
  });
}

export async function adjustStock(
  actorId: string,
  input: {
    sku: string;
    change: string;
    reason: InventoryReason;
    note: string;
    warehouseId: string;
  },
): Promise<string> {
  const variant = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (!variant) {
    throw new Error(`SKU ${input.sku} was not found`);
  }
  const delta = Number(input.change);
  if (variant.stock + delta < 0) {
    throw new Error(`Only ${variant.stock} in stock for ${variant.sku}`);
  }
  if (input.warehouseId) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: input.warehouseId },
    });
    if (!warehouse) {
      throw new Error("Choose a warehouse");
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.productVariant.update({
      where: { id: variant.id },
      data: { stock: { increment: delta } },
    });
    await tx.inventoryLog.create({
      data: {
        variantId: variant.id,
        warehouseId: input.warehouseId || null,
        delta,
        quantityAfter: next.stock,
        reason: input.reason,
        note: input.note.trim() || null,
      },
    });
    return next;
  });
  await recordAudit({
    actorId,
    action: "inventory.adjust",
    entityType: "ProductVariant",
    entityId: variant.id,
    metadata: { sku: variant.sku, delta, reason: input.reason },
  });
  if (delta < 0) {
    const { checkVariantsLowStock } = await import("@/server/admin/alerts");
    await checkVariantsLowStock([variant.id]).catch(() => undefined);
  }
  return `${variant.sku} now has ${updated.stock} in stock.`;
}

export async function listLedger(sku: string): Promise<LedgerRow[]> {
  const rows = await prisma.inventoryLog.findMany({
    where: sku ? { variant: { sku: { contains: sku } } } : undefined,
    include: {
      variant: { include: { product: { select: { name: true } } } },
      warehouse: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    sku: row.variant.sku,
    name: row.variant.product.name,
    delta: row.delta,
    quantityAfter: row.quantityAfter,
    reason: row.reason,
    note: row.note ?? "",
    warehouse: row.warehouse?.name ?? "",
    at: stamp(row.createdAt),
  }));
}

export async function assignBarcodes(actorId: string, ids: string[]): Promise<number> {
  let assigned = 0;
  for (const id of [...new Set(ids)].slice(0, 50)) {
    const variant = await prisma.productVariant.findUnique({ where: { id } });
    if (!variant || variant.barcode) {
      continue;
    }
    const code = variant.sku.toUpperCase().replace(/[^0-9A-Z .\-]/g, "");
    if (!code) {
      continue;
    }
    try {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { barcode: code },
      });
      assigned += 1;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  await recordAudit({
    actorId,
    action: "inventory.barcode",
    entityType: "ProductVariant",
    metadata: { assigned },
  });
  return assigned;
}

export async function loadLabels(ids: string[]): Promise<LabelSheet[]> {
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...new Set(ids)].slice(0, 50) } },
    include: { product: { select: { name: true } } },
  });
  return variants.map((variant) => {
    const code = variant.barcode || variant.sku;
    return {
      name: variant.product.name,
      sku: variant.sku,
      barcode: code,
      price: (variant.salePrice ?? variant.price).toNumber(),
      svg: barcodeSvg(code),
    };
  });
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  const rows = await prisma.supplier.findMany({
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    orders: row._count.purchaseOrders,
  }));
}

export async function saveSupplier(
  actorId: string,
  input: { name: string; phone: string; email: string; address: string },
): Promise<void> {
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("Enter a valid email");
  }
  const supplier = await prisma.supplier.create({
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
  await recordAudit({
    actorId,
    action: "inventory.supplier",
    entityType: "Supplier",
    entityId: supplier.id,
  });
}

export async function listPurchases(): Promise<PurchaseRow[]> {
  const rows = await prisma.purchaseOrder.findMany({
    include: { supplier: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    supplier: row.supplier.name,
    status: row.status,
    lines: row._count.items,
    at: stamp(row.createdAt),
  }));
}

function purchaseNumber(): string {
  return `PO${String(Math.floor(100000 + Math.random() * 900000))}`;
}

export async function createPurchase(
  actorId: string,
  input: {
    supplierId: string;
    notes: string;
    lines: { sku: string; qty: string; cost: string }[];
  },
): Promise<{ id: string; number: string }> {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) {
    throw new Error("Choose a supplier");
  }
  const prepared = [];
  for (const line of input.lines) {
    const variant = await prisma.productVariant.findUnique({
      where: { sku: line.sku },
      include: { product: { select: { name: true } } },
    });
    if (!variant) {
      throw new Error(`SKU ${line.sku} was not found`);
    }
    prepared.push({
      variantId: variant.id,
      qty: Number(line.qty),
      costPrice: Number(line.cost),
    });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = purchaseNumber();
    try {
      const created = await prisma.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          number,
          notes: input.notes.trim() || null,
          status: "DRAFT",
          items: { create: prepared },
        },
      });
      await recordAudit({
        actorId,
        action: "inventory.purchase",
        entityType: "PurchaseOrder",
        entityId: created.id,
        metadata: { number },
      });
      return { id: created.id, number };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not create the purchase. Try again.");
}

export async function getPurchase(id: string): Promise<PurchaseDetail | null> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { variant: { include: { product: { select: { name: true } } } } },
      },
    },
  });
  if (!order) {
    return null;
  }
  return {
    id: order.id,
    number: order.number,
    supplier: order.supplier.name,
    status: order.status,
    notes: order.notes ?? "",
    at: stamp(order.createdAt),
    items: order.items.map((item) => ({
      sku: item.variant.sku,
      name: item.variant.product.name,
      qty: item.qty,
      cost: item.costPrice.toNumber(),
    })),
  };
}

export async function receivePurchase(actorId: string, id: string): Promise<string> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { variant: true } } },
  });
  if (!order) {
    throw new Error("Purchase not found");
  }
  if (order.status === "RECEIVED") {
    throw new Error("This purchase is already received");
  }
  if (order.status === "CANCELLED") {
    throw new Error("This purchase is cancelled");
  }
  const warehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } });
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const next = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.qty } },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          warehouseId: warehouse?.id,
          delta: item.qty,
          quantityAfter: next.stock,
          reason: "PURCHASE",
          note: `Received ${order.number}`,
        },
      });
    }
    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: "RECEIVED", orderedAt: new Date() },
    });
  });
  await recordAudit({
    actorId,
    action: "inventory.receive",
    entityType: "PurchaseOrder",
    entityId: order.id,
    metadata: { number: order.number },
  });
  return `${order.number} received and stock updated.`;
}
