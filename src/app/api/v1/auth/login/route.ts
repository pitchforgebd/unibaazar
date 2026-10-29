import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/customer";
import { loginAccount, sessionToken } from "@/server/auth/accounts";
import { recordLoginEvent } from "@/server/auth/login-history";
import {
  pending2faCookieOptions,
  sessionCookie,
  signPending2fa,
} from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { recordAudit } from "@/server/security/audit";
import { guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const identity = parsed.data.identity;
  try {
    const guard = await guardWrite(request, "login", parsed.data.captchaToken, identity);
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const result = await loginAccount(identity, parsed.data.password);
    if (result.kind === "2fa") {
      await recordLoginEvent({
        userId: result.userId,
        identity,
        success: true,
        ip: guard.ip,
        userAgent,
        reason: "2fa_pending",
      });
      const pending = await signPending2fa(result.userId);
      const response = NextResponse.json({ data: { requires2fa: true } });
      response.cookies.set(
        pending2faCookieOptions.name,
        pending,
        pending2faCookieOptions.options,
      );
      return response;
    }
    const session = await createAuthSession({
      userId: result.session.userId,
      role: result.session.role,
      ip: guard.ip,
      userAgent,
    });
    await recordLoginEvent({
      userId: session.userId,
      identity,
      success: true,
      ip: guard.ip,
      userAgent,
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
    const guardIp = (() => {
      try {
        return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      } catch {
        return "unknown";
      }
    })();
    await recordLoginEvent({
      identity,
      success: false,
      ip: guardIp,
      userAgent: request.headers.get("user-agent") ?? undefined,
      reason: error instanceof ApiError ? "auth_failed" : "error",
    }).catch(() => undefined);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
