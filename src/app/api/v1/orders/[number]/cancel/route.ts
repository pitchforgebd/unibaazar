import { NextResponse } from "next/server";
import { cancelBodySchema } from "@/lib/validation/api";
import { cancelOrder } from "@/server/orders/orders";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ number: string }> };

export async function POST(request: Request, context: Context) {
  const { number } = await context.params;
  const parsed = cancelBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(() => cancelOrder(number, parsed.data.phone));
}
