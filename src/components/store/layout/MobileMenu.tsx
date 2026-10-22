"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { siteConfig, type SiteLink } from "@/config/site";
import { CloseIcon, MenuIcon } from "@/components/store/layout/icons";
import { Logo } from "@/components/store/layout/Logo";

const drawerLinks: SiteLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "shop", label: "Shop", href: "/shop" },
  { id: "cart", label: "Cart", href: "/cart" },
  { id: "account", label: "Account", href: "/account" },
  ...siteConfig.topBarLinks,
];

const commonIds = new Set(["home", "shop", "cart", "account"]);

export function MobileMenu() {
  const t = useTranslations("common");
  const links = useTranslations("links");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-black/10 text-ink lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">{t("openMenu")}</span>
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-drawer"
            aria-labelledby={titleId}
            className="absolute top-0 left-0 flex h-full w-[min(100%,20rem)] flex-col bg-card shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <p id={titleId} className="sr-only">
                {t("menu")}
              </p>
              <Logo />
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">{t("closeMenu")}</span>
                <CloseIcon />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto px-2 py-3">
              {drawerLinks.map((link) => {
                const active = link.href === pathname;
                return (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-3 text-sm font-medium ${
                        active ? "bg-peach text-primary" : "text-foreground hover:bg-page"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {commonIds.has(link.id) ? t(link.id) : links(link.id)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
