export function MarketingDenied() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-ink">Catalog access required</h1>
      <p className="mt-2 text-sm text-muted">
        This staff role cannot change coupons, campaigns, or offers.
      </p>
    </section>
  );
}
