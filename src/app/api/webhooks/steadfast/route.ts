import { NextResponse } from "next/server";
import { handleSteadfastWebhook, verifyWebhookToken } from "@/server/courier/webhook";

export async function POST(request: Request) {
  const authorized = await verifyWebhookToken(request.headers.get("authorization"));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload: unknown = await request.json().catch(() => null);
  const result = await handleSteadfastWebhook(payload);
  return NextResponse.json(
    result.statusCode === 200 ? { data: { ok: true } } : { error: result.message },
    { status: result.statusCode },
  );
}
