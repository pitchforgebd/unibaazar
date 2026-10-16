import { NextResponse } from "next/server";
import { z } from "zod";
import { phoneField } from "@/lib/validation/customer";
import { initiatePayment } from "@/server/payments/payments";
import { handle, readJson } from "@/server/http";

const schema = z.object({
  orderNumber: z.string().trim().min(4),
  phone: phoneField,
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(() => initiatePayment(parsed.data.orderNumber, parsed.data.phone));
}
