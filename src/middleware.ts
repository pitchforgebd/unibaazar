import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Runs on every storefront route. Admin isn't localized (CLAUDE.md /
  // ARCHITECTURE.md — zero next-intl usage in src/components/admin), so it
  // and everything else (API routes, webhooks, cron, static files, Next's
  // own internals) are excluded.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
