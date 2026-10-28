import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/validation/customer";
import { updateProfileForSession } from "@/server/account/account";
import { handle, readJson } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

export async function PATCH(request: Request) {
  const parsed = profileSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    assertSameOrigin(request);
    return updateProfileForSession(parsed.data);
  });
}
