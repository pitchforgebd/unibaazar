import { ShieldAlert } from "lucide-react";

export function MarketingDenied() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-theme bg-card p-8 text-center shadow-soft">
      <ShieldAlert aria-hidden="true" className="size-10 text-muted" />
      <h1 className="font-heading text-xl font-semibold text-ink">
        Catalog access required
      </h1>
      <p className="text-sm text-muted">
        This staff role cannot change coupons, campaigns, or offers.
      </p>
    </section>
  );
}
