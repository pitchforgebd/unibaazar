"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FileText,
  FolderTree,
  HelpCircle,
  LayoutDashboard,
  type LucideProps,
  Megaphone,
  Package,
  Ruler,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Tags,
  Activity,
  UserCog,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { NotificationBell } from "@/components/admin/NotificationBell";

type NavLink = { href: string; label: string; icon: ComponentType<LucideProps> };
type NavGroup = { label: string; links: NavLink[] };

const catalogLinks: NavLink[] = [
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/attributes", label: "Attributes", icon: SlidersHorizontal },
  { href: "/admin/units", label: "Units", icon: Ruler },
  { href: "/admin/labels", label: "Labels", icon: Tags },
  { href: "/admin/tags", label: "Tags", icon: Tags },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/questions", label: "Questions", icon: HelpCircle },
];

export function AdminShell({
  name,
  canCatalog,
  canOrders,
  canCustomers,
  canContent,
  canReports,
  canSettings,
  canUsers,
  children,
}: {
  name: string;
  canCatalog: boolean;
  canOrders: boolean;
  canCustomers: boolean;
  canContent: boolean;
  canReports: boolean;
  canSettings: boolean;
  canUsers: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const groups: NavGroup[] = [
    {
      label: "Overview",
      links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
    },
    ...(canOrders
      ? [
          {
            label: "Sales",
            links: [{ href: "/admin/orders", label: "Orders", icon: ShoppingCart }],
          },
        ]
      : []),
    ...(canCustomers
      ? [
          {
            label: "Customers",
            links: [{ href: "/admin/customers", label: "Customers", icon: Users }],
          },
        ]
      : []),
    ...(canCatalog
      ? [
          {
            label: "Catalog",
            links: [
              { href: "/admin/inventory", label: "Inventory", icon: Package },
              { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
              ...catalogLinks,
            ],
          },
        ]
      : []),
    ...(canReports
      ? [
          {
            label: "Insights",
            links: [{ href: "/admin/reports", label: "Reports", icon: Activity }],
          },
        ]
      : []),
    ...(canContent
      ? [
          {
            label: "Content",
            links: [{ href: "/admin/content", label: "Content", icon: FileText }],
          },
        ]
      : []),
    ...(canUsers
      ? [
          {
            label: "Team",
            links: [{ href: "/admin/users", label: "Users", icon: UserCog }],
          },
        ]
      : []),
    ...(canSettings
      ? [
          {
            label: "Settings",
            links: [
              { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
              { href: "/admin/tracking", label: "Tracking", icon: Activity },
              { href: "/admin/seo", label: "SEO", icon: Search },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-page md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="bg-ink text-white print:hidden">
        <p className="px-4 py-4 text-lg font-semibold">UniBaazar</p>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-4 md:px-2">
          {groups.map((group) => (
            <div key={group.label} className="md:space-y-1">
              <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/40 md:block">
                {group.label}
              </p>
              {group.links.map((link) => {
                const active =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${active ? "bg-white/15" : "hover:bg-white/10"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-black/5 bg-card px-4 py-3 print:hidden">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <LogoutButton />
          </div>
        </header>
        <main className="p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
