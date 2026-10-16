import { z } from "zod";

export const reportIds = [
  "sales",
  "product",
  "category",
  "brand",
  "variant",
  "payment",
  "area",
  "status",
  "customers",
  "coupons",
  "profit",
  "stock",
  "low-stock",
  "returns",
  "courier",
  "traffic",
  "carts",
  "tax",
] as const;

export type ReportId = (typeof reportIds)[number];

export const reportLabels: Record<ReportId, string> = {
  sales: "Sales",
  product: "By product",
  category: "By category",
  brand: "By brand",
  variant: "By variant",
  payment: "By payment method",
  area: "By delivery area",
  status: "Orders by status",
  customers: "Customers",
  coupons: "Coupon usage",
  profit: "Profit",
  stock: "Stock and valuation",
  "low-stock": "Low stock",
  returns: "Returns and refunds",
  courier: "Courier performance",
  traffic: "Traffic source",
  carts: "Abandoned carts",
  tax: "Tax",
};

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportQuerySchema = z.object({
  report: z.enum(reportIds).catch("sales"),
  preset: z.enum(["day", "week", "month", "custom"]).catch("month"),
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
