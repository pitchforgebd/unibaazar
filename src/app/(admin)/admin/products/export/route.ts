import { NextResponse } from "next/server";
import { catalogAccess } from "@/server/admin/access";
import { exportProductsCsv, parseProductListQuery } from "@/server/admin/products";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await catalogAccess();
  if (!session) {
    return NextResponse.json(
      { error: "You do not have access to the catalog" },
      { status: 403 },
    );
  }
  const url = new URL(request.url);
  const csv = await exportProductsCsv(
    parseProductListQuery(Object.fromEntries(url.searchParams.entries())),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products.csv"',
    },
  });
}
