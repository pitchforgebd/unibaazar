import { z } from "zod";
import { phoneField } from "@/lib/validation/customer";
import { requestOtp } from "@/server/auth/accounts";
import { guardWrite } from "@/server/security/guard";
import { handle, readJson } from "@/server/http";
import { NextResponse } from "next/server";

const schema = z.object({
  phone: phoneField,
  captchaToken: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    await guardWrite(request, "otp", parsed.data.captchaToken, parsed.data.phone);
    const code = await requestOtp(parsed.data.phone);
    return {
      sent: true,
      ...(process.env.NODE_ENV !== "production" && code ? { previewCode: code } : {}),
    };
  });
}
