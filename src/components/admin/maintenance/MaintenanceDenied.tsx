export function MaintenanceDenied() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-ink">Super-admin access required</h1>
      <p className="mt-2 text-sm text-muted">
        Maintenance jobs can seed demo data and re-bootstrap the admin account, so only
        the super-admin role can open this page.
      </p>
    </section>
  );
}
