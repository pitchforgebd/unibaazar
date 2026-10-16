import { NextResponse } from "next/server";
import { customersAccess } from "@/server/admin/access";
import { exportCustomersCsv, parseCustomerListQuery } from "@/server/admin/customers";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await customersAccess();
  if (!session) {
    return NextResponse.json(
      { error: "You do not have access to customers" },
      { status: 403 },
    );
  }
  const url = new URL(request.url);
  const csv = await exportCustomersCsv(
    parseCustomerListQuery(Object.fromEntries(url.searchParams.entries())),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers.csv"',
    },
  });
}
