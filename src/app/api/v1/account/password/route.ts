import { NextResponse } from "next/server";
import { passwordSchema } from "@/lib/validation/customer";
import { changePasswordForSession } from "@/server/account/account";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = passwordSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    await changePasswordForSession(parsed.data);
    return { ok: true };
  });
}
