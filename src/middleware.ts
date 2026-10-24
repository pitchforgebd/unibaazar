import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { findActiveRedirect } from "@/server/seo/public";

const intlMiddleware = createMiddleware(routing);

// A 301/302 needs the real HTTP status code `next/navigation`'s
// redirect()/permanentRedirect() can't give (307/308 only) — that, in
// turn, needs Prisma, which the default Edge middleware runtime can't
// run. Stable since Next 15.5 (this project's version), `runtime:
// "nodejs"` below opts this whole file into the Node.js runtime instead
// — see docs/decisions/0022-phase-11-scope-seo-module.md: the admin
// redirect manager (Admin → SEO) saved rows into the `Redirect` table
// since whichever earlier phase built it, but nothing ever read that
// table back — every saved redirect was a complete no-op on the real
// site until this fix.
export default async function middleware(request: NextRequest) {
  const redirect = await findActiveRedirect(request.nextUrl.pathname);
  if (redirect) {
    return NextResponse.redirect(
      new URL(redirect.toPath, request.url),
      redirect.statusCode,
    );
  }
  return intlMiddleware(request);
}

export const config = {
  // Runs on every storefront route. Admin isn't localized (CLAUDE.md /
  // ARCHITECTURE.md — zero next-intl usage in src/components/admin), so it
  // and everything else (API routes, webhooks, cron, static files, Next's
  // own internals) are excluded.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
  runtime: "nodejs",
};
