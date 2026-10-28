import { NextResponse } from "next/server";
import { addressSchema } from "@/lib/validation/customer";
import {
  createAddressForSession,
  listAddressesForSession,
} from "@/server/account/account";
import { handle, readJson } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

export async function GET() {
  return handle(() => listAddressesForSession());
}

export async function POST(request: Request) {
  const parsed = addressSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    assertSameOrigin(request);
    return createAddressForSession(parsed.data);
  });
}
