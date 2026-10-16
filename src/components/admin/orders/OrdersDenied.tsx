export function OrdersDenied() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-ink">Order access required</h1>
      <p className="mt-2 text-sm text-muted">
        This staff role cannot view or change orders.
      </p>
    </section>
  );
}
