export function InventoryDenied() {
  return (
    <section className="rounded-theme bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-ink">Catalog access required</h1>
      <p className="mt-2 text-sm text-muted">
        This staff role cannot change stock, suppliers, or purchases.
      </p>
    </section>
  );
}
