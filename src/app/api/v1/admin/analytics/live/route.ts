import { NextResponse } from "next/server";
import { countActiveVisitors } from "@/server/admin/analytics";
import { readSession } from "@/server/auth/session";
import { roleAllows } from "@/server/security/permissions";

export async function GET() {
  const session = await readSession();
  if (!session || !roleAllows(session.role, "reports.view")) {
    return NextResponse.json({ error: "Reports access required" }, { status: 401 });
  }
  const count = await countActiveVisitors();
  return NextResponse.json({ data: { count } });
}
