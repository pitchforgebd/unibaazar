"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations("account");
  const links = [
    { href: "/account", label: t("navDashboard") },
    { href: "/account/orders", label: t("navOrders") },
    { href: "/account/addresses", label: t("navAddresses") },
    { href: "/wishlist", label: t("navWishlist") },
    { href: "/account/profile", label: t("navProfile") },
    { href: "/account/password", label: t("navPassword") },
  ];

  return (
    <nav
      aria-label={t("navAriaLabel")}
      className="h-fit rounded-lg bg-card p-2 shadow-soft"
    >
      <ul>
        {links.map((link) => {
          const active =
            link.href === "/account"
              ? pathname === "/account"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-peach text-primary" : "text-foreground hover:bg-page"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
