import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { buildRootMetadata } from "@/app/metadata";
import { FooterScript, HeaderScript } from "@/components/layout/SiteScripts";
import { loadSystem } from "@/server/settings/store";
import "@/styles/globals.css";

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
        <FooterScript script={system.footerScript} />
      </body>
    </html>
  );
}
