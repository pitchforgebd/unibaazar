import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/customer";
import { registerAccount, sessionToken } from "@/server/auth/accounts";
import { sessionCookie } from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  try {
    const guard = await guardWrite(request, "login", parsed.data.captchaToken);
    const base = await registerAccount(parsed.data);
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
