import { NextResponse } from "next/server";
import { callbackBodySchema } from "@/lib/validation/api";
import { applyPaymentCallback } from "@/server/payments/payments";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = callbackBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(() =>
    applyPaymentCallback({
      secret: request.headers.get("x-webhook-secret"),
      orderNumber: parsed.data.orderNumber,
      gatewayRef: parsed.data.gatewayRef,
      status: parsed.data.status,
    }),
  );
}
