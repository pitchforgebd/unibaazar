import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { sessionToken } from "@/server/auth/accounts";
import {
  completeOAuthRegistration,
  oauthPendingCookie,
  readPendingOAuth,
} from "@/server/auth/oauth";
import { sessionCookie } from "@/server/auth/session";
import { createAuthSession } from "@/server/auth/sessions";
import { ApiError, readJson } from "@/server/http";
import { recordAudit } from "@/server/security/audit";
import { guardWrite } from "@/server/security/guard";

const completeSchema = z.object({
  phone: z.string().trim().min(1, "Enter a phone number"),
  captchaToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const pendingToken = jar.get(oauthPendingCookie.name)?.value;
    if (!pendingToken) {
      throw new ApiError(400, "Start Google or Facebook sign-in again");
    }
    const pending = await readPendingOAuth(pendingToken);
    if (!pending) {
      throw new ApiError(400, "That social sign-in expired. Try again.");
    }
    const parsed = completeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the form");
    }
    const guard = await guardWrite(request, "login", parsed.data.captchaToken);
    const base = await completeOAuthRegistration(pending, parsed.data.phone);
    const session = await createAuthSession({
      userId: base.userId,
      role: base.role,
      ip: guard.ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    await recordAudit({
      actorId: session.userId,
      action: `auth.oauth.${pending.provider}.complete`,
      entityType: "User",
      entityId: session.userId,
      ip: guard.ip,
    });
    const token = await sessionToken(session);
    const response = NextResponse.json({ data: { role: session.role } });
    response.cookies.set(sessionCookie.name, token, sessionCookie.options);
    response.cookies.set(oauthPendingCookie.name, "", {
      ...oauthPendingCookie.options,
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
