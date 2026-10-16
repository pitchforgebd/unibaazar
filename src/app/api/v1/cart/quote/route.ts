import { NextResponse } from "next/server";
import { quoteBodySchema } from "@/lib/validation/api";
import { quoteCart } from "@/server/checkout/quote";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = quoteBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    const quote = await quoteCart(parsed.data);
    return {
      lines: quote.lines,
      subtotal: quote.subtotal,
      discount: quote.discount,
      deliveryCharge: quote.deliveryCharge,
      total: quote.total,
    };
  });
}
