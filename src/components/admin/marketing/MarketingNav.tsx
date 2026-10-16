"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/marketing", label: "Coupons" },
  { href: "/admin/marketing/flash", label: "Flash sales" },
  { href: "/admin/marketing/banners", label: "Banners" },
  { href: "/admin/marketing/audience", label: "Audience" },
  { href: "/admin/marketing/relations", label: "Related" },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/marketing"
            ? pathname === "/admin/marketing"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
              active ? "bg-ink text-white" : "bg-card text-ink shadow-soft"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
