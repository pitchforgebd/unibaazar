"use server";

import { revalidatePath } from "next/cache";
import { maintenanceJobIdSchema } from "@/lib/validation/admin-maintenance";
import { requireSuperAdmin } from "@/server/admin/access";
import { runMaintenanceJob } from "@/server/admin/maintenance/jobs";
import { actionError, type ActionResult } from "@/server/admin/result";

// One generic action for every job in the registry: the job itself (see
// src/server/admin/maintenance/jobs.ts) validates `payload` with its own zod
// schema when it needs input (bootstrap-admin, media-backfill); jobs that
// take no input just ignore it.
export async function runMaintenanceJobAction(input: {
  jobId: string;
  payload?: unknown;
}): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const { jobId } = maintenanceJobIdSchema.parse(input);
    const result = await runMaintenanceJob(jobId, session.userId, input.payload);
    revalidatePath("/admin/maintenance");
    return { ok: true, message: result.summary };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
