"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/admin/orders", label: "All orders" },
  { href: "/admin/orders/new", label: "New order" },
  { href: "/admin/orders/abandoned", label: "Abandoned" },
  { href: "/admin/orders/returns", label: "Returns" },
  { href: "/admin/orders/templates", label: "Templates" },
];

export function OrdersNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Orders sections" className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/orders"
            ? pathname === "/admin/orders"
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
