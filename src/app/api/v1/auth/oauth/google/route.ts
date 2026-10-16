import { NextResponse } from "next/server";
import { ApiError } from "@/server/http";
import { oauthStartUrl } from "@/server/auth/oauth";

export async function GET() {
  try {
    const url = await oauthStartUrl("google");
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        ),
      );
    }
    throw error;
  }
}
