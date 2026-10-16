import { NextResponse } from "next/server";
import { trackBodySchema } from "@/lib/validation/api";
import { trackOrder } from "@/server/orders/orders";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = trackBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(() => trackOrder(parsed.data.orderId, parsed.data.phone));
}
