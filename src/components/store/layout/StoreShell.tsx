import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Toaster } from "@/components/ui/Toaster";
import { CartDrawer } from "@/components/store/layout/CartDrawer";
import { CartHydration } from "@/components/store/layout/CartHydration";
import { ChatButtons } from "@/components/store/layout/ChatButtons";
import { CookieBanner } from "@/components/store/layout/CookieBanner";
import { Footer } from "@/components/store/layout/Footer";
import { Header } from "@/components/store/layout/Header";
import { MobileNav } from "@/components/store/layout/MobileNav";
import { TopBar } from "@/components/store/layout/TopBar";
import { UtmCapture } from "@/components/store/layout/UtmCapture";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { StorePixels } from "@/components/store/tracking/StorePixels";
import {
  loadCheckout,
  loadGeneral,
  loadSocial,
  loadSystem,
  loadTheme,
} from "@/server/settings/store";
import { loadTracking } from "@/server/tracking/config";

type StoreShellProps = {
  children: ReactNode;
};

export async function StoreShell({ children }: StoreShellProps) {
  const t = await getTranslations("common");
  const [general, theme, checkout, social, system, tracking] = await Promise.all([
    loadGeneral(),
    loadTheme(),
    loadCheckout(),
    loadSocial(),
    loadSystem(),
    loadTracking(),
  ]);
  const socialLinks = [
    { label: "Facebook" as const, href: social.facebook || "#" },
    { label: "Instagram" as const, href: social.instagram || "#" },
    { label: "YouTube" as const, href: social.youtube || "#" },
    { label: "WhatsApp" as const, href: social.whatsapp || "#" },
  ];

  return (
    <div
      className="flex min-h-screen flex-col pb-16 md:pb-0"
      style={
        theme.font === "system" ? { fontFamily: "system-ui, sans-serif" } : undefined
      }
    >
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <CartHydration />
      <UtmCapture />
      <a
        href="#main"
        className="absolute top-4 left-4 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        {t("skip")}
      </a>
      {theme.showTopBar ? (
        <TopBar freeFrom={checkout.freeFrom} color={theme.primary} />
      ) : null}
      <Header name={general.name} logoUrl={general.logo} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer
        name={general.name}
        description={general.description}
        logoUrl={general.logo}
        phone={general.phone}
        email={general.email}
        address={general.address}
        hours={general.hours}
        social={socialLinks}
      />
      <MobileNav />
      <CartDrawer />
      <CookieBanner text={system.cookieText} />
      {theme.showChat ? (
        <ChatButtons messenger={social.messenger} whatsapp={social.whatsapp} />
      ) : null}
      <Toaster />
      <StorePixels config={tracking} />
    </div>
  );
}
