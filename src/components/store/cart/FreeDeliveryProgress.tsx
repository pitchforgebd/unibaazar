"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { formatTaka } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

// One request per page load, shared by the drawer and the /cart page.
let thresholdRequest: Promise<number | null> | null = null;

/**
 * The free-delivery threshold, in Taka, from the public /api/v1/settings
 * endpoint. Mirrors the server's own resolution in
 * modules/pricing/delivery.ts's parseDeliverySettings (the `delivery.freeFrom`
 * key, else the documented 6500 default) — read directly here rather than
 * importing modules/pricing, whose money helpers pull @prisma/client into
 * the browser bundle. Null (no bar) if the settings can't be fetched.
 */
function fetchThreshold(): Promise<number | null> {
  thresholdRequest ??= fetch("/api/v1/settings")
    .then((response) => (response.ok ? response.json() : null))
    .then((body: unknown) => {
      if (typeof body !== "object" || body === null || !("data" in body)) {
        return null;
      }
      const data = body.data;
      const value =
        typeof data === "object" && data !== null && "delivery.freeFrom" in data
          ? data["delivery.freeFrom"]
          : undefined;
      return typeof value === "number" ? value : siteConfig.freeShippingThreshold;
    })
    .catch(() => null);
  return thresholdRequest;
}

function useFreeDeliveryThreshold(): number | null {
  const [threshold, setThreshold] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void fetchThreshold().then((value) => {
      if (active) setThreshold(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return threshold;
}

/**
 * "Add ৳X more for free delivery" with a progress bar. `merchandise` is the
 * cart's subtotal after the server-validated coupon discount — the same
 * amount the server's deliveryCharge() compares against the threshold — so
 * the bar flips to "unlocked" exactly when checkout stops charging delivery.
 */
export function FreeDeliveryProgress({
  merchandise,
  className,
}: {
  merchandise: number;
  className?: string;
}) {
  const t = useTranslations("cart.freeDelivery");
  const threshold = useFreeDeliveryThreshold();
  if (threshold === null || threshold <= 0) {
    return null;
  }
  const remaining = Math.max(threshold - merchandise, 0);
  const unlocked = remaining === 0;
  const progress = Math.min(merchandise / threshold, 1);
  const message = unlocked
    ? t("unlocked")
    : t.markup("remaining", {
        amount: formatTaka(remaining),
        strong: (chunks) => chunks,
      });

  return (
    <div className={className}>
      <p
        aria-live="polite"
        className={cn(
          "text-sm",
          unlocked ? "font-semibold text-success" : "text-foreground",
        )}
      >
        {unlocked
          ? message
          : t.rich("remaining", {
              amount: formatTaka(remaining),
              strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
            })}
      </p>
      <div
        role="progressbar"
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(merchandise, threshold)}
        aria-valuetext={message}
        className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-slow ease-standard motion-reduce:transition-none",
            unlocked ? "bg-success" : "bg-primary",
          )}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
