"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/content", label: "Pages" },
  { href: "/admin/content/blog", label: "Blog" },
  { href: "/admin/content/menus", label: "Menus" },
  { href: "/admin/content/home", label: "Homepage" },
  { href: "/admin/content/faq", label: "FAQ" },
  { href: "/admin/content/testimonials", label: "Testimonials" },
];

export function ContentNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => {
        const active =
          link.href === "/admin/content"
            ? pathname === "/admin/content"
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
