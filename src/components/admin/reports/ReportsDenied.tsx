import { Lock } from "lucide-react";

export function ReportsDenied() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-theme bg-card p-8 text-center shadow-soft">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-peach text-primary"
      >
        <Lock className="size-7" />
      </span>
      <h1 className="font-heading text-2xl font-bold text-ink">
        Reports access required
      </h1>
      <p className="max-w-sm text-sm text-muted">
        This staff role cannot open reports. Ask an admin to grant the reports permission
        if you need access.
      </p>
    </section>
  );
}
