"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Heart,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Package,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { focusRing } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/utils/cn";

/**
 * Route navigation (each item is its own page), so it's a `<nav>` with
 * `aria-current`, not ARIA tabs. A scrollable pill row on mobile, a
 * sidebar from `lg` up.
 */
export function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations("account");
  const links: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/account", label: t("navDashboard"), icon: LayoutDashboard },
    { href: "/account/orders", label: t("navOrders"), icon: Package },
    { href: "/account/addresses", label: t("navAddresses"), icon: MapPin },
    { href: "/wishlist", label: t("navWishlist"), icon: Heart },
    { href: "/account/profile", label: t("navProfile"), icon: UserRound },
    { href: "/account/password", label: t("navPassword"), icon: KeyRound },
  ];

  return (
    <nav
      aria-label={t("navAriaLabel")}
      className="-mx-4 h-fit min-w-0 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:rounded-theme lg:bg-card lg:p-2 lg:shadow-soft"
    >
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {links.map((link) => {
          const active =
            link.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap",
                  "transition-colors duration-fast ease-standard motion-reduce:transition-none",
                  "lg:rounded-theme lg:px-3",
                  focusRing,
                  active
                    ? "bg-peach text-ink"
                    : "bg-card text-foreground shadow-soft hover:bg-page lg:bg-transparent lg:shadow-none",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-4", active ? "text-primary" : "text-muted")}
                />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
