import { NextResponse } from "next/server";
import { readSession, sessionCookie, signSession } from "@/server/auth/session";
import { handle } from "@/server/http";

export async function POST() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  }
  const token = await signSession(session);
  const response = await handle(async () => ({ role: session.role }));
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return response;
}
