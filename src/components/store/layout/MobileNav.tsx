"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { useCartCount, useCartHydrated } from "@/store/cart";
import {
  CartIcon,
  CategoriesIcon,
  HomeIcon,
  UserIcon,
} from "@/components/store/layout/icons";

const icons: Record<string, ReactNode> = {
  home: <HomeIcon />,
  categories: <CategoriesIcon />,
  cart: <CartIcon size={20} />,
  account: <UserIcon />,
};

export function MobileNav() {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const hydrated = useCartHydrated();
  const t = useTranslations("common");

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-card pb-[env(safe-area-inset-bottom)] shadow-soft md:hidden"
    >
      <ul className="grid grid-cols-4">
        {siteConfig.mobileNav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className="relative">
                  {icons[item.id]}
                  {item.id === "cart" && hydrated && cartCount > 0 ? (
                    <span className="absolute -top-2 -right-3 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
                {t(item.id)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
