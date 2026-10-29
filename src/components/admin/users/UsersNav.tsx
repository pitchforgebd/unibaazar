"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/users", label: "Staff" },
  { href: "/admin/users/roles", label: "Roles" },
  { href: "/admin/users/audit", label: "Audit log" },
  { href: "/admin/users/logins", label: "Login history" },
  { href: "/admin/users/sessions", label: "Sessions" },
  { href: "/admin/users/security", label: "IP allow-list" },
  { href: "/admin/users/2fa", label: "My 2FA" },
];

export function UsersNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/users"
            ? pathname === "/admin/users"
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
