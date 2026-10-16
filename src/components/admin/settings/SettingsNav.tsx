"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/settings", label: "General" },
  { href: "/admin/settings/theme", label: "Theme" },
  { href: "/admin/settings/checkout", label: "Checkout" },
  { href: "/admin/settings/integrations", label: "Gateways" },
  { href: "/admin/settings/invoice", label: "Invoice" },
  { href: "/admin/settings/social", label: "Social" },
  { href: "/admin/settings/notifications", label: "Alerts" },
  { href: "/admin/settings/system", label: "System" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/settings"
            ? pathname === "/admin/settings"
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
