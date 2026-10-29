import { z } from "zod";
import { forgotSchema } from "@/lib/validation/customer";
import { resetPassword } from "@/server/auth/accounts";
import { guardWrite } from "@/server/security/guard";
import { handle, readJson } from "@/server/http";
import { NextResponse } from "next/server";

const schema = forgotSchema.and(
  z.object({
    code: z.string().trim().length(6),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
);

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    await guardWrite(request, "otp", parsed.data.captchaToken, parsed.data.identity);
    await resetPassword(parsed.data.identity, parsed.data.code, parsed.data.password);
    return { reset: true };
  });
}
