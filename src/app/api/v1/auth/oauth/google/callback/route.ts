import { NextResponse } from "next/server";
import { sessionToken } from "@/server/auth/accounts";
import {
  exchangeOAuthCode,
  loginWithExistingOAuth,
  oauthPendingCookie,
  signPendingOAuth,
} from "@/server/auth/oauth";
import {
  pending2faCookieOptions,
  sessionCookie,
  signPending2fa,
} from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/server/security/audit";
import { clientIp } from "@/server/security/guard";
import { siteOrigin } from "@/server/tracking/config";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const origin = siteOrigin();
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Google sign-in was cancelled")}`,
    );
  }
  try {
    const pending = await exchangeOAuthCode("google", code);
    const existing = await loginWithExistingOAuth(pending);
    if (existing) {
      const totpRows = await prisma.$queryRaw<
        Array<{ totpEnabled: number | boolean; totpSecret: string | null }>
      >`SELECT totpEnabled, totpSecret FROM User WHERE id = ${existing.userId} LIMIT 1`;
      const totp = totpRows[0];
      if (
        totp &&
        (totp.totpEnabled === true || totp.totpEnabled === 1) &&
        totp.totpSecret
      ) {
        const pendingToken = await signPending2fa(existing.userId);
        const response = NextResponse.redirect(`${origin}/login?2fa=1`);
        response.cookies.set(
          pending2faCookieOptions.name,
          pendingToken,
          pending2faCookieOptions.options,
        );
        response.cookies.delete(oauthPendingCookie.name);
        return response;
      }
      const session = await createAuthSession({
        userId: existing.userId,
        role: existing.role,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
      await recordAudit({
        actorId: session.userId,
        action: "auth.oauth.google",
        entityType: "User",
        entityId: session.userId,
        ip: clientIp(request),
      });
      const token = await sessionToken(session);
      const response = NextResponse.redirect(
        `${origin}${session.role === "customer" ? "/account" : "/admin"}`,
      );
      response.cookies.set(sessionCookie.name, token, sessionCookie.options);
      response.cookies.delete(oauthPendingCookie.name);
      return response;
    }
    const pendingToken = await signPendingOAuth(pending);
    const response = NextResponse.redirect(`${origin}/register/social`);
    response.cookies.set(
      oauthPendingCookie.name,
      pendingToken,
      oauthPendingCookie.options,
    );
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }
}
