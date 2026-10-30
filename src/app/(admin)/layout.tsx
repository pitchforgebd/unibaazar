import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { buildRootMetadata } from "@/app/metadata";
import { FooterScript, HeaderScript } from "@/components/layout/SiteScripts";
import { ToastStack } from "@/components/ui/toast/ToastStack";
import { loadSystem } from "@/server/settings/store";
import "@/styles/globals.css";

// Admin is never localized or statically generated (ARCHITECTURE.md §4.5)
// — every page under it reads live session/permission state and current
// DB rows, so a cached HTML shell would be actively wrong. In practice
// this already held at runtime, since the nested admin/layout.tsx reads
// `headers()` (a dynamic API) before any page renders. But this *root*
// layout's own `loadSystem()` call below runs first in the tree and
// reads the DB directly, with no dynamic-API marker of its own — so
// Next's build-time static-optimization pass tried to prerender every
// admin page, reached this DB call before ever reaching the nested
// layout's `headers()` call, and crashed the whole build the first time
// DATABASE_URL pointed at an address nothing was listening on (which
// ci.yml's build-artifact job does on purpose — see ADR 0031). Declaring
// it explicitly here, inherited by the whole subtree, is a single-point
// fix instead of adding the same export to all 63 admin page.tsx files.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const system = await loadSystem();

  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="min-h-full bg-page font-sans text-foreground antialiased">
        <HeaderScript script={system.headerScript} />
        {children}
        <ToastStack regionLabel="Notifications" dismissLabel="Dismiss" />
        <FooterScript script={system.footerScript} />
      </body>
    </html>
  );
}
