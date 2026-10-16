import { NextResponse } from "next/server";
import { placeOrderSchema } from "@/lib/validation/api";
import { placeOrder } from "@/server/orders/orders";
import { guardWrite } from "@/server/security/guard";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = placeOrderSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    const { captchaToken, ...order } = parsed.data;
    const guard = await guardWrite(request, "checkout", captchaToken);
    return placeOrder(order, guard);
  });
}
