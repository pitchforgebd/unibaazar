import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DesignShowcase } from "@/components/design/DesignShowcase";

export const metadata: Metadata = { title: "Design system" };

// Forced dynamic: nothing else about this page would stop Next from
// statically pre-rendering it at build time, which would bake in whichever
// branch the *build-time* env happened to take and then serve that same
// static HTML forever afterward regardless of the real runtime env —
// confirmed the hard way (a build taken with ALLOW_DESIGN_ROUTE=1 kept
// serving the real page even after restarting the server without it).
// force-dynamic guarantees the check below actually runs per request.
export const dynamic = "force-dynamic";

// Dev-only — master plan §4.1/§4.4 explicitly want this blocked in
// production. ALLOW_DESIGN_ROUTE is the one deliberate exception: npm run
// start:test runs a real NODE_ENV=production build (so Playwright's
// E2E/a11y/visual suites exercise the actual production code path), and
// this route still needs to be reachable there to get its own axe/visual
// coverage — see .env.test.example. Real production deploys never set it,
// so they stay blocked by default.
export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DESIGN_ROUTE !== "1") {
    notFound();
  }
  const { locale } = await params;
  setRequestLocale(locale);
  return <DesignShowcase />;
}
