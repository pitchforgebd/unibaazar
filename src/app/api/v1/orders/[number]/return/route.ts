import { NextResponse } from "next/server";
import { returnBodySchema } from "@/lib/validation/api";
import { requestReturn } from "@/server/orders/orders";
import { handle, readJson } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

type Context = { params: Promise<{ number: string }> };

export async function POST(request: Request, context: Context) {
  const { number } = await context.params;
  const parsed = returnBodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    assertSameOrigin(request);
    return requestReturn(number, parsed.data.phone, parsed.data.reason);
  });
}
