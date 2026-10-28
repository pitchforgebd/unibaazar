import { NextResponse } from "next/server";
import { z } from "zod";
import { listStaffNotifications, markNotificationsRead } from "@/server/admin/alerts";
import { readSession } from "@/server/auth/session";
import { isStaffRole } from "@/server/security/permissions";
import { ApiError, readJson } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

export async function GET() {
  const session = await readSession();
  if (!session || !isStaffRole(session.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 401 });
  }
  const data = await listStaffNotifications(session.userId);
  return NextResponse.json({ data });
}

const markSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await readSession();
    if (!session || !isStaffRole(session.role)) {
      throw new ApiError(401, "Staff only");
    }
    const parsed = markSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(400, "Invalid request");
    }
    const count = await markNotificationsRead(session.userId, parsed.data.ids);
    return NextResponse.json({ data: { count } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
