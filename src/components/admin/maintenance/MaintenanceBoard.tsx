import {
  MaintenanceJobCard,
  type MaintenanceJobSummary,
  type MaintenanceRunRow,
} from "@/components/admin/maintenance/MaintenanceJobCard";

export function MaintenanceBoard({
  jobs,
  runsByJob,
}: {
  jobs: MaintenanceJobSummary[];
  runsByJob: Record<string, MaintenanceRunRow[]>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {jobs.map((job) => (
        <MaintenanceJobCard key={job.id} job={job} runs={runsByJob[job.id] ?? []} />
      ))}
    </div>
  );
}
