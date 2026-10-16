import { NextResponse } from "next/server";
import { readSession, sessionCookie } from "@/server/auth/session";
import { revokeAuthSession } from "@/server/auth/sessions";

export async function POST() {
  const session = await readSession();
  if (session?.sid) {
    await revokeAuthSession(session.sid, session.userId);
  }
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  return response;
}
