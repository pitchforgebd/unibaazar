import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Bengali, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { loadGeneral, loadSystem } from "@/server/settings/store";
import { loadTracking } from "@/server/tracking/config";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
});

function safeScript(value: string): string {
  return value.replace(/<\/script/gi, "");
}

export async function generateMetadata(): Promise<Metadata> {
  const [general, tracking] = await Promise.all([loadGeneral(), loadTracking()]);
  return {
    title: {
      default: general.name,
      template: `%s | ${general.name}`,
    },
    description: general.description,
    ...(general.favicon ? { icons: { icon: general.favicon } } : {}),
    ...(tracking.searchConsole
      ? { verification: { google: tracking.searchConsole } }
      : {}),
  };
}

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const [messages, system] = await Promise.all([getMessages(), loadSystem()]);

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${notoSansBengali.variable} h-full`}
    >
      <body className="min-h-full bg-page font-sans text-foreground antialiased">
        {system.headerScript ? (
          <script dangerouslySetInnerHTML={{ __html: safeScript(system.headerScript) }} />
        ) : null}
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        {system.footerScript ? (
          <script dangerouslySetInnerHTML={{ __html: safeScript(system.footerScript) }} />
        ) : null}
      </body>
    </html>
  );
}
