import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { buildRootMetadata } from "@/app/metadata";
import { FooterScript, HeaderScript } from "@/components/layout/SiteScripts";
import { routing } from "@/i18n/routing";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { themeStyleTag } from "@/lib/theme/styleTag";
import { loadSystem, loadTheme } from "@/server/settings/store";
import "@/styles/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [messages, system, theme] = await Promise.all([
    getMessages(),
    loadSystem(),
    loadTheme(),
  ]);
  const tokens = THEME_PRESETS[theme.presetId];

  return (
    <html lang={locale} className={`${fontVariables} h-full`}>
      <head>
        {/* Per-request, not build-time — this is the entire "switching a
         * preset re-skins the storefront with no rebuild" mechanism (see
         * src/lib/theme/styleTag.ts). Admin doesn't render this and keeps
         * globals.css's static fallback instead. */}
        <style dangerouslySetInnerHTML={{ __html: themeStyleTag(tokens) }} />
      </head>
      <body className="min-h-full bg-page font-sans text-foreground antialiased">
        <HeaderScript script={system.headerScript} />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <FooterScript script={system.footerScript} />
      </body>
    </html>
  );
}
