"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/inventory", label: "Stock" },
  { href: "/admin/inventory/ledger", label: "Ledger" },
  { href: "/admin/inventory/suppliers", label: "Suppliers" },
  { href: "/admin/inventory/purchases", label: "Purchases" },
];

export function InventoryNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/inventory"
            ? pathname === "/admin/inventory"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-theme px-3 py-2 text-sm font-semibold transition-colors duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active ? "bg-ink text-white" : "bg-card text-ink shadow-soft hover:bg-ink/5"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
