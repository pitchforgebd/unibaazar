import { NextResponse } from "next/server";
import { forgotSchema } from "@/lib/validation/customer";
import { requestReset } from "@/server/auth/accounts";
import { guardWrite } from "@/server/security/guard";
import { handle, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = forgotSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    await guardWrite(request, "otp", parsed.data.captchaToken);
    const code = await requestReset(parsed.data.identity);
    return {
      sent: true,
      ...(process.env.NODE_ENV !== "production" && code ? { previewCode: code } : {}),
    };
  });
}
