"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/orders"
            ? pathname === "/admin/orders"
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
