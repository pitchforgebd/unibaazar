import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  reportLabels,
  reportQuerySchema,
  type ReportId,
  type ReportQuery,
} from "@/lib/validation/admin-reports";
import { loadInvoice } from "@/server/settings/store";

export type ReportTable = {
  id: ReportId;
  title: string;
  note: string;
  columns: string[];
  rows: string[][];
  rangeLabel: string;
};

type Range = { start: Date; end: Date };

const saleFilter = { not: "CANCELLED" as const };

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfDhakaDay(day: string): Date {
  return new Date(`${day}T00:00:00+06:00`);
}

function money(value: number): string {
  return String(Math.round(value));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function reportRange(query: ReportQuery, now = new Date()): Range {
  const today = startOfDhakaDay(dayKey(now));
  const endToday = new Date(addDays(today, 1).getTime() - 1);
  if (query.preset === "day") {
    return { start: today, end: endToday };
  }
  if (query.preset === "week") {
    return { start: addDays(today, -6), end: endToday };
  }
  if (query.preset === "month") {
    return { start: addDays(today, -29), end: endToday };
  }
  const start = query.from ? startOfDhakaDay(query.from) : today;
  const endDay = query.to ? startOfDhakaDay(query.to) : today;
  const end = new Date(addDays(endDay, 1).getTime() - 1);
  const capped = end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000;
  return capped
    ? { start: addDays(endDay, -365), end }
    : { start, end: end < start ? endToday : end };
}

function rangeLabel(range: Range): string {
  return `${dayKey(range.start)} to ${dayKey(range.end)}`;
}

function daysIn(range: Range): string[] {
  const keys: string[] = [];
  let cursor = startOfDhakaDay(dayKey(range.start));
  const last = dayKey(range.end);
  while (dayKey(cursor) <= last && keys.length < 370) {
    keys.push(dayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

function textPayload(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

async function salesReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
    select: { placedAt: true, total: true },
  });
  const totals = new Map(daysIn(range).map((day) => [day, { orders: 0, total: 0 }]));
  for (const order of orders) {
    const bucket = totals.get(dayKey(order.placedAt));
    if (!bucket) {
      continue;
    }
    bucket.orders += 1;
    bucket.total += order.total.toNumber();
  }
  const rows = [...totals.entries()].map(([day, bucket]) => [
    day,
    String(bucket.orders),
    money(bucket.total),
  ]);
  const orderCount = orders.length;
  const sum = orders.reduce((total, order) => total + order.total.toNumber(), 0);
  rows.push(["Total", String(orderCount), money(sum)]);
  return {
    columns: ["Day", "Orders", "Sales (BDT)"],
    rows,
    note: "Cancelled orders are left out. Amounts are in BDT.",
  };
}

async function lineReport(
  range: Range,
  group: "product" | "category" | "brand" | "variant" | "profit",
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
    },
    select: {
      name: true,
      sku: true,
      qty: true,
      lineTotal: true,
      variant: {
        select: {
          costPrice: true,
          product: {
            select: {
              name: true,
              brand: { select: { name: true } },
              categories: { take: 1, select: { category: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
  const buckets = new Map<string, { qty: number; sale: number; cost: number }>();
  for (const item of items) {
    const key =
      group === "category"
        ? (item.variant?.product.categories[0]?.category.name ?? "Uncategorized")
        : group === "brand"
          ? (item.variant?.product.brand.name ?? "No brand")
          : group === "variant"
            ? item.sku
            : (item.variant?.product.name ?? item.name);
    const bucket = buckets.get(key) ?? { qty: 0, sale: 0, cost: 0 };
    bucket.qty += item.qty;
    bucket.sale += item.lineTotal.toNumber();
    bucket.cost += item.qty * (item.variant?.costPrice?.toNumber() ?? 0);
    buckets.set(key, bucket);
  }
  const rows = [...buckets.entries()]
    .sort((left, right) => right[1].sale - left[1].sale)
    .map(([name, bucket]) =>
      group === "profit"
        ? [
            name,
            String(bucket.qty),
            money(bucket.sale),
            money(bucket.cost),
            money(bucket.sale - bucket.cost),
          ]
        : [name, String(bucket.qty), money(bucket.sale)],
    );
  return {
    columns:
      group === "profit"
        ? ["Product", "Qty", "Sale (BDT)", "Cost (BDT)", "Profit (BDT)"]
        : ["Name", "Qty", "Sales (BDT)"],
    rows,
    note:
      group === "profit"
        ? "Cost uses the variant cost price. A blank cost counts as 0. Cancelled orders are left out."
        : "Cancelled orders are left out. Amounts are in BDT.",
  };
}

async function paymentReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
    _count: { _all: true },
    _sum: { total: true },
  });
  return {
    columns: ["Method", "Orders", "Sales (BDT)"],
    rows: orders.map((row) => [
      row.paymentMethod,
      String(row._count._all),
      money(row._sum.total?.toNumber() ?? 0),
    ]),
    note: "Cancelled orders are left out.",
  };
}

async function areaReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.groupBy({
    by: ["area"],
    where: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
    _count: { _all: true },
    _sum: { total: true, deliveryCharge: true },
  });
  return {
    columns: ["Area", "Orders", "Delivery (BDT)", "Sales (BDT)"],
    rows: orders.map((row) => [
      row.area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka",
      String(row._count._all),
      money(row._sum.deliveryCharge?.toNumber() ?? 0),
      money(row._sum.total?.toNumber() ?? 0),
    ]),
    note: "Cancelled orders are left out.",
  };
}

async function statusReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.groupBy({
    by: ["status"],
    where: { placedAt: { gte: range.start, lte: range.end } },
    _count: { _all: true },
    _sum: { total: true },
  });
  return {
    columns: ["Status", "Orders", "Total (BDT)"],
    rows: orders.map((row) => [
      row.status,
      String(row._count._all),
      money(row._sum.total?.toNumber() ?? 0),
    ]),
    note: "Every status in the range is listed, including cancelled orders.",
  };
}

async function customerReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
    select: {
      phone: true,
      name: true,
      total: true,
      customer: { select: { createdAt: true, phone: true } },
    },
  });
  const buckets = new Map<
    string,
    { name: string; orders: number; total: number; createdAt: Date | null }
  >();
  for (const order of orders) {
    const bucket = buckets.get(order.phone) ?? {
      name: order.name,
      orders: 0,
      total: 0,
      createdAt: order.customer?.createdAt ?? null,
    };
    bucket.orders += 1;
    bucket.total += order.total.toNumber();
    buckets.set(order.phone, bucket);
  }
  if (buckets.size === 0) {
    return {
      columns: ["Name", "Phone", "Kind", "Orders", "Sales (BDT)"],
      rows: [],
      note: "Top customers in the range. New means the customer record was created in the range. Returning means more than one kept order.",
    };
  }
  const lifetime = await prisma.order.groupBy({
    by: ["phone"],
    where: { phone: { in: [...buckets.keys()] }, status: saleFilter },
    _count: { _all: true },
  });
  const counts = new Map(lifetime.map((row) => [row.phone, row._count._all]));
  const rows = [...buckets.entries()]
    .sort((left, right) => right[1].total - left[1].total)
    .slice(0, 20)
    .map(([phone, bucket]) => {
      const all = counts.get(phone) ?? bucket.orders;
      const kind =
        bucket.createdAt &&
        bucket.createdAt >= range.start &&
        bucket.createdAt <= range.end
          ? "New"
          : all > 1
            ? "Returning"
            : "Single";
      return [bucket.name, phone, kind, String(bucket.orders), money(bucket.total)];
    });
  return {
    columns: ["Name", "Phone", "Kind", "Orders", "Sales (BDT)"],
    rows,
    note: "Top customers in the range. New means the customer record was created in the range. Returning means more than one kept order.",
  };
}

async function couponReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const orders = await prisma.order.findMany({
    where: {
      placedAt: { gte: range.start, lte: range.end },
      status: saleFilter,
      couponId: { not: null },
    },
    select: { discount: true, coupon: { select: { code: true } } },
  });
  const buckets = new Map<string, { orders: number; discount: number }>();
  for (const order of orders) {
    const code = order.coupon?.code ?? "Coupon";
    const bucket = buckets.get(code) ?? { orders: 0, discount: 0 };
    bucket.orders += 1;
    bucket.discount += order.discount.toNumber();
    buckets.set(code, bucket);
  }
  return {
    columns: ["Code", "Orders", "Discount (BDT)"],
    rows: [...buckets.entries()].map(([code, bucket]) => [
      code,
      String(bucket.orders),
      money(bucket.discount),
    ]),
    note: "Orders that used a coupon. Cancelled orders are left out.",
  };
}

async function stockReport(
  lowOnly: boolean,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const variants = await prisma.productVariant.findMany({
    where: { status: "ACTIVE" },
    select: {
      sku: true,
      stock: true,
      price: true,
      costPrice: true,
      product: { select: { name: true, lowStockThreshold: true } },
    },
    orderBy: { sku: "asc" },
  });
  const rows = variants
    .filter((variant) => !lowOnly || variant.stock <= variant.product.lowStockThreshold)
    .map((variant) => {
      const unit = variant.costPrice?.toNumber() ?? variant.price.toNumber();
      return [
        variant.product.name,
        variant.sku,
        String(variant.stock),
        money(unit),
        money(variant.stock * unit),
      ];
    });
  return {
    columns: ["Product", "SKU", "Stock", "Unit (BDT)", "Valuation (BDT)"],
    rows,
    note: lowOnly
      ? "Active variants at or under the product low-stock threshold. Valuation uses cost when it is set, otherwise the selling price."
      : "Current stock for active variants. The date range does not change this snapshot. Valuation uses cost when it is set, otherwise the selling price.",
  };
}

type StockValuationInput = {
  categoryName: string;
  stock: number;
  costPrice: number | null;
};

/** Pure aggregation so the grouping/total math is unit-testable without a
 * database. Unlike `stockReport` above (a per-SKU listing that falls back
 * to the selling price when cost isn't set), this is a strict cost-basis
 * valuation: a variant with no cost price contributes 0, matching how the
 * profit report already treats a blank cost. */
export function aggregateStockValuation(
  variants: StockValuationInput[],
): Pick<ReportTable, "columns" | "rows" | "note"> {
  const buckets = new Map<
    string,
    { variants: number; units: number; valuation: number }
  >();
  for (const variant of variants) {
    const bucket = buckets.get(variant.categoryName) ?? {
      variants: 0,
      units: 0,
      valuation: 0,
    };
    bucket.variants += 1;
    bucket.units += variant.stock;
    bucket.valuation += variant.stock * (variant.costPrice ?? 0);
    buckets.set(variant.categoryName, bucket);
  }
  const rows = [...buckets.entries()]
    .sort((left, right) => right[1].valuation - left[1].valuation)
    .map(([category, bucket]) => [
      category,
      String(bucket.variants),
      String(bucket.units),
      money(bucket.valuation),
    ]);
  const totalUnits = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const totalValuation = variants.reduce(
    (sum, variant) => sum + variant.stock * (variant.costPrice ?? 0),
    0,
  );
  rows.push([
    "Total",
    String(variants.length),
    String(totalUnits),
    money(totalValuation),
  ]);
  return {
    columns: ["Category", "Variants", "Units in stock", "Valuation (BDT)"],
    rows,
    note: "Active variants of published products only. Valuation is stock times the variant cost price — a variant with no cost price counts as 0 (it does not fall back to the selling price). This is a current snapshot; the date range does not change it.",
  };
}

async function stockValuationReport(): Promise<
  Pick<ReportTable, "columns" | "rows" | "note">
> {
  const variants = await prisma.productVariant.findMany({
    where: { status: "ACTIVE", product: { status: "PUBLISHED" } },
    select: {
      stock: true,
      costPrice: true,
      product: {
        select: {
          categories: { take: 1, select: { category: { select: { name: true } } } },
        },
      },
    },
  });
  return aggregateStockValuation(
    variants.map((variant) => ({
      categoryName: variant.product.categories[0]?.category.name ?? "Uncategorized",
      stock: variant.stock,
      costPrice: variant.costPrice?.toNumber() ?? null,
    })),
  );
}

async function returnsReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const rows = await prisma.returnRequest.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    select: {
      status: true,
      reason: true,
      refundAmount: true,
      createdAt: true,
      order: { select: { number: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    columns: ["When", "Order", "Request", "Order status", "Refund (BDT)", "Reason"],
    rows: rows.map((row) => [
      dayKey(row.createdAt),
      row.order.number,
      row.status,
      row.order.status,
      row.refundAmount ? money(row.refundAmount.toNumber()) : "0",
      row.reason.slice(0, 80),
    ]),
    note: "Return requests opened in the range.",
  };
}

async function courierReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const [delivered, cancelled, returned] = await Promise.all([
    prisma.order.count({
      where: { placedAt: { gte: range.start, lte: range.end }, status: "DELIVERED" },
    }),
    prisma.order.count({
      where: { placedAt: { gte: range.start, lte: range.end }, status: "CANCELLED" },
    }),
    prisma.shipment.count({
      where: { status: "RETURNED", updatedAt: { gte: range.start, lte: range.end } },
    }),
  ]);
  const closed = delivered + cancelled;
  const rate = closed === 0 ? "0" : String(Math.round((delivered / closed) * 100));
  return {
    columns: ["Measure", "Value"],
    rows: [
      ["Delivered orders", String(delivered)],
      ["Cancelled orders", String(cancelled)],
      ["Delivery rate %", rate],
      ["Shipments marked returned", String(returned)],
    ],
    note: "Delivery rate is delivered orders divided by delivered plus cancelled orders, matching the dashboard.",
  };
}

async function trafficReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const events = await prisma.trackingEvent.findMany({
    where: { createdAt: { gte: range.start, lte: range.end }, name: "PageView" },
    select: { payload: true },
    take: 2000,
  });
  const buckets = new Map<string, number>();
  for (const event of events) {
    const payload = textPayload(event.payload);
    const source = payload.utm_source;
    if (typeof source !== "string" || source.trim() === "") {
      continue;
    }
    const medium = typeof payload.utm_medium === "string" ? payload.utm_medium : "";
    const key = medium ? `${source} / ${medium}` : source;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return {
    columns: ["Source", "Page views"],
    rows: [...buckets.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([source, count]) => [source, String(count)]),
    note: "Page views that arrived with a utm_source. A visit without campaign parameters is not listed.",
  };
}

async function cartReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const carts = await prisma.cart.findMany({
    where: {
      status: "ACTIVE",
      updatedAt: { gte: range.start, lte: range.end },
      items: { some: {} },
    },
    select: {
      updatedAt: true,
      customer: { select: { name: true, phone: true } },
      items: { select: { qty: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return {
    columns: ["Updated", "Customer", "Phone", "Items"],
    rows: carts.map((cart) => [
      dayKey(cart.updatedAt),
      cart.customer?.name ?? "Guest",
      cart.customer?.phone ?? "",
      String(cart.items.reduce((total, item) => total + item.qty, 0)),
    ]),
    note: "Open carts that still have items and were updated in the range. A cart is stored when a shopper signs in.",
  };
}

async function taxReport(
  range: Range,
): Promise<Pick<ReportTable, "columns" | "rows" | "note">> {
  const [invoice, orders] = await Promise.all([
    loadInvoice(),
    prisma.order.findMany({
      where: { placedAt: { gte: range.start, lte: range.end }, status: saleFilter },
      select: { subtotal: true, discount: true },
    }),
  ]);
  const taxable = orders.reduce(
    (total, order) => total + order.subtotal.toNumber() - order.discount.toNumber(),
    0,
  );
  const tax = (taxable * invoice.vatPercent) / 100;
  return {
    columns: ["Measure", "Value"],
    rows: [
      ["VAT rate %", String(invoice.vatPercent)],
      ["Taxable amount (BDT)", money(taxable)],
      ["VAT (BDT)", money(tax)],
      ["Orders", String(orders.length)],
    ],
    note: "VAT is calculated from merchandise after the coupon. It is not added on top of the order total.",
  };
}

export function parseReportQuery(
  raw: Record<string, string | string[] | undefined>,
): ReportQuery {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return reportQuerySchema.parse({
    report: first("report"),
    preset: first("preset"),
    from: first("from"),
    to: first("to"),
  });
}

export async function loadReport(query: ReportQuery): Promise<ReportTable> {
  const range = reportRange(query);
  const body =
    query.report === "sales"
      ? await salesReport(range)
      : query.report === "product" ||
          query.report === "category" ||
          query.report === "brand" ||
          query.report === "variant" ||
          query.report === "profit"
        ? await lineReport(range, query.report === "profit" ? "profit" : query.report)
        : query.report === "payment"
          ? await paymentReport(range)
          : query.report === "area"
            ? await areaReport(range)
            : query.report === "status"
              ? await statusReport(range)
              : query.report === "customers"
                ? await customerReport(range)
                : query.report === "coupons"
                  ? await couponReport(range)
                  : query.report === "stock"
                    ? await stockReport(false)
                    : query.report === "low-stock"
                      ? await stockReport(true)
                      : query.report === "stockValuation"
                        ? await stockValuationReport()
                        : query.report === "returns"
                          ? await returnsReport(range)
                          : query.report === "courier"
                            ? await courierReport(range)
                            : query.report === "traffic"
                              ? await trafficReport(range)
                              : query.report === "carts"
                                ? await cartReport(range)
                                : await taxReport(range);
  return {
    id: query.report,
    title: reportLabels[query.report],
    rangeLabel: rangeLabel(range),
    ...body,
  };
}

export function reportToCsv(table: ReportTable): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [table.columns, ...table.rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

export function reportToExcel(table: ReportTable): string {
  const cell = (value: string) =>
    `<Cell><Data ss:Type="String">${value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</Data></Cell>`;
  const rows = [table.columns, ...table.rows]
    .map((row) => `<Row>${row.map(cell).join("")}</Row>`)
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report"><Table>${rows}</Table></Worksheet>
</Workbook>`;
}
