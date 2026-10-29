"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/utils/cn";

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
    <nav aria-label="Marketing sections" className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/marketing"
            ? pathname === "/admin/marketing"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonStyles({ variant: active ? "primary" : "outline", size: "sm" }),
              "whitespace-nowrap",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
