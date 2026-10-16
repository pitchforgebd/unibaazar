import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionToken, userFor2fa } from "@/server/auth/accounts";
import { recordLoginEvent } from "@/server/auth/login-history";
import {
  pending2faCookieOptions,
  readPending2fa,
  sessionCookie,
} from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { verifyTotp } from "@/server/auth/totp";
import { recordAudit } from "@/server/security/audit";
import { clientIp, guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

const schema = z.object({
  code: z.string().trim().min(6).max(12),
  captchaToken: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }
  try {
    const guard = await guardWrite(request, "login", parsed.data.captchaToken);
    const userId = await readPending2fa();
    if (!userId) {
      throw new ApiError(401, "Sign in again to continue");
    }
    const user = await userFor2fa(userId);
    if (!user || user.status !== "ACTIVE" || !user.totpEnabled || !user.totpSecret) {
      throw new ApiError(401, "Sign in again to continue");
    }
    if (!verifyTotp(user.totpSecret, parsed.data.code)) {
      await recordLoginEvent({
        userId: user.id,
        identity: user.phone,
        success: false,
        ip: guard.ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        reason: "2fa_failed",
      });
      throw new ApiError(401, "That code is not valid");
    }
    const session = await createAuthSession({
      userId: user.id,
      role: user.role.slug,
      ip: guard.ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    await recordLoginEvent({
      userId: user.id,
      identity: user.phone,
      success: true,
      ip: guard.ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      reason: "2fa_ok",
    });
    await recordAudit({
      actorId: session.userId,
      action: "auth.login",
      entityType: "User",
      entityId: session.userId,
      ip: guard.ip,
    });
    const token = await sessionToken(session);
    const response = NextResponse.json({ data: { role: session.role } });
    response.cookies.set(sessionCookie.name, token, sessionCookie.options);
    response.cookies.set(pending2faCookieOptions.name, "", {
      ...pending2faCookieOptions.options,
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const userId = await readPending2fa();
  return NextResponse.json({
    data: { pending: Boolean(userId), ip: clientIp(request) },
  });
}
