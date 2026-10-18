import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type MaintenanceRunStatus = "RUNNING" | "SUCCESS" | "FAILED";

export type MaintenanceRunRow = {
  id: string;
  jobId: string;
  status: MaintenanceRunStatus;
  startedAt: string;
  finishedAt: string | null;
  resultSummary: Prisma.JsonValue | null;
  triggeredBy: string;
};

export async function startRun(
  jobId: string,
  triggeredByUserId: string,
): Promise<string> {
  const run = await prisma.maintenanceJobRun.create({
    data: { jobId, status: "RUNNING", triggeredByUserId },
  });
  return run.id;
}

export async function finishRun(
  runId: string,
  status: "SUCCESS" | "FAILED",
  resultSummary: Record<string, unknown>,
): Promise<void> {
  await prisma.maintenanceJobRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      resultSummary: resultSummary as Prisma.InputJsonValue,
    },
  });
}

export async function listRecentRuns(
  jobId: string,
  limit = 5,
): Promise<MaintenanceRunRow[]> {
  const rows = await prisma.maintenanceJobRun.findMany({
    where: { jobId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { triggeredBy: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    status: row.status as MaintenanceRunStatus,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    resultSummary: row.resultSummary,
    triggeredBy: row.triggeredBy?.name ?? "Unknown",
  }));
}
