"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type MobileFiltersProps = {
  activeCount: number;
  /** Sticky actions under the scrolling form (Apply targets the form by id). */
  footer: ReactNode;
  /** The filter form itself — the same server-rendered form the desktop sidebar shows. */
  children: ReactNode;
};

/**
 * Below the `lg` breakpoint the filter sidebar is hidden and the same form
 * opens in a bottom sheet instead. The sheet only mounts its contents while
 * open, so there's never a second live copy of the form on desktop.
 */
export function MobileFilters({ activeCount, footer, children }: MobileFiltersProps) {
  const t = useTranslations("shop");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("filtersOpenAria", { count: activeCount })}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        {t("filtersTitle")}
        {activeCount > 0 ? (
          <Badge
            variant="accent"
            aria-hidden="true"
            className="min-w-5 justify-center px-1.5"
          >
            {activeCount}
          </Badge>
        ) : null}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        title={t("filtersTitle")}
        closeLabel={t("filtersClose")}
        footer={footer}
      >
        {children}
      </Sheet>
    </>
  );
}
