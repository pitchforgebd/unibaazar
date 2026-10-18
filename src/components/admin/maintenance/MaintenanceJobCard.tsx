"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runMaintenanceJobAction } from "@/app/(admin)/admin/maintenance-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

export type MaintenanceJobSummary = {
  id: string;
  label: string;
  description: string;
  form: "none" | "bootstrapAdmin" | "mediaBackfill";
};

export type MaintenanceRunRow = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  resultSummary: unknown;
  triggeredBy: string;
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
}

function summaryText(resultSummary: unknown): string {
  if (resultSummary && typeof resultSummary === "object" && "summary" in resultSummary) {
    const value = (resultSummary as { summary?: unknown }).summary;
    if (typeof value === "string") {
      return value;
    }
  }
  return "—";
}

export function MaintenanceJobCard({
  job,
  runs,
}: {
  job: MaintenanceJobSummary;
  runs: MaintenanceRunRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [phone, setPhone] = useState("01700000000");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("admin@unibaazar.com");

  async function run(payload?: unknown): Promise<void> {
    setPending(true);
    const result = await runMaintenanceJobAction({ jobId: job.id, payload });
    setMessage(result.message);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
      <div>
        <h2 className="font-semibold text-ink">{job.label}</h2>
        <p className="text-sm text-muted">{job.description}</p>
      </div>

      {job.form === "none" ? (
        <button
          type="button"
          className={buttonClass()}
          disabled={pending}
          onClick={() => void run()}
        >
          Run
        </button>
      ) : null}

      {job.form === "mediaBackfill" ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">
              Batch size (optional)
            </span>
            <input
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              inputMode="numeric"
              placeholder="e.g. 50"
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            className={buttonClass()}
            disabled={pending}
            onClick={() =>
              void run(batchSize.trim() ? { batchSize: batchSize.trim() } : {})
            }
          >
            Run
          </button>
        </div>
      ) : null}

      {job.form === "bootstrapAdmin" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            className={`${buttonClass("ink")} sm:col-span-2`}
            disabled={pending || password.length < 8}
            onClick={() => void run({ phone, password, name, email })}
          >
            Run
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-ink">{message}</p> : null}

      {runs.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-black/5">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-black/5 text-muted">
              <tr>
                <th className="px-2 py-1 font-semibold">When</th>
                <th className="px-2 py-1 font-semibold">By</th>
                <th className="px-2 py-1 font-semibold">Status</th>
                <th className="px-2 py-1 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-black/5 last:border-0">
                  <td className="px-2 py-1 whitespace-nowrap">
                    {formatWhen(run.startedAt)}
                  </td>
                  <td className="px-2 py-1">{run.triggeredBy}</td>
                  <td className="px-2 py-1">{run.status}</td>
                  <td className="px-2 py-1">{summaryText(run.resultSummary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted">Never run yet.</p>
      )}
    </div>
  );
}
