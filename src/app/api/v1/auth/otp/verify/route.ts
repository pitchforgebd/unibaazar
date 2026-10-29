import { NextResponse } from "next/server";
import { z } from "zod";
import { phoneField } from "@/lib/validation/customer";
import { sessionToken, verifyOtp } from "@/server/auth/accounts";
import { sessionCookie } from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

const schema = z.object({
  phone: phoneField,
  code: z.string().trim().length(6),
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
  try {
    const guard = await guardWrite(
      request,
      "otp",
      parsed.data.captchaToken,
      parsed.data.phone,
    );
    const base = await verifyOtp(parsed.data.phone, parsed.data.code);
    const session = await createAuthSession({
      userId: base.userId,
      role: base.role,
      ip: guard.ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const token = await sessionToken(session);
    const response = NextResponse.json({ data: { role: session.role } });
    response.cookies.set(sessionCookie.name, token, sessionCookie.options);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
