import type { Metadata } from "next";
import { MaintenanceBoard } from "@/components/admin/maintenance/MaintenanceBoard";
import { MaintenanceDenied } from "@/components/admin/maintenance/MaintenanceDenied";
import { superAdminAccess } from "@/server/admin/access";
import { maintenanceJobs } from "@/server/admin/maintenance/jobs";
import { listRecentRuns, type MaintenanceRunRow } from "@/server/admin/maintenance/runs";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const session = await superAdminAccess();
  if (!session) {
    return <MaintenanceDenied />;
  }

  const runsByJob: Record<string, MaintenanceRunRow[]> = {};
  await Promise.all(
    maintenanceJobs.map(async (job) => {
      runsByJob[job.id] = await listRecentRuns(job.id, 5);
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Maintenance</h1>
        <p className="text-sm text-muted">
          Run one-off maintenance jobs inside the live app. Super-admin only. Every job is
          safe to run more than once.
        </p>
      </div>
      <MaintenanceBoard
        jobs={maintenanceJobs.map((job) => ({
          id: job.id,
          label: job.label,
          description: job.description,
          form: job.form,
        }))}
        runsByJob={runsByJob}
      />
    </div>
  );
}
