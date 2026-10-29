import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export function DashboardCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<LucideProps>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ink">
        {Icon ? <Icon aria-hidden="true" className="size-4 text-primary" /> : null}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
