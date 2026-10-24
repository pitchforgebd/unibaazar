import { recordAudit } from "@/server/security/audit";
import {
  bootstrapAdminInputSchema,
  mediaBackfillInputSchema,
} from "@/lib/validation/admin-maintenance";
import { alertPaymentMismatch } from "@/server/admin/alerts";
import { sendAbandonedCartEmails } from "@/server/admin/maintenance/abandoned-cart";
import { bootstrapAdminAccount } from "@/server/admin/maintenance/bootstrap-admin";
import { clearAllCaches } from "@/server/admin/maintenance/cache";
import { runMediaBackfill } from "@/server/admin/maintenance/media-backfill";
import { reconcilePayments } from "@/server/admin/maintenance/reconcile-payments";
import { reindexSearch } from "@/server/admin/maintenance/reindex";
import { seedDemoCatalog } from "@/server/admin/maintenance/seed-catalog";
import { rebuildSitemap } from "@/server/admin/maintenance/sitemap";
import { finishRun, startRun } from "@/server/admin/maintenance/runs";
import { retryFailedConversions } from "@/server/tracking/signals";

export type MaintenanceJobResult = {
  summary: string;
  details?: Record<string, unknown>;
};

// `form` tells the Maintenance board what input (if any) to collect before
// running the job. Every other job takes no input — a plain "Run" button.
export type MaintenanceJob = {
  id: string;
  label: string;
  description: string;
  form: "none" | "bootstrapAdmin" | "mediaBackfill";
  run: (input: unknown) => Promise<MaintenanceJobResult>;
};

export const maintenanceJobs: MaintenanceJob[] = [
  {
    id: "cache-clear",
    label: "Clear cache",
    description:
      "Invalidate every cached route across the storefront and admin. Use this if an " +
      "admin suspects the storefront is showing stale data.",
    form: "none",
    run: async () => {
      const { paths } = await clearAllCaches();
      return { summary: "Cache cleared.", details: { paths } };
    },
  },
  {
    id: "sitemap-rebuild",
    label: "Rebuild sitemap",
    description:
      "/sitemap.xml is generated fresh from the database on every request, so this is a " +
      "no-op kept here for completeness.",
    form: "none",
    run: async () => {
      const { note } = await rebuildSitemap();
      return { summary: note };
    },
  },
  {
    id: "reindex",
    label: "Reindex search",
    description:
      "Search scores a live MySQL query in memory — there is no separate index, so this " +
      "is a no-op kept here for completeness.",
    form: "none",
    run: async () => {
      const { note } = await reindexSearch();
      return { summary: note };
    },
  },
  {
    id: "media-backfill",
    label: "Media backfill",
    description:
      "Generate missing AVIF/WebP variants for existing product images, in batches. " +
      "Resumable — run again to pick up where the last batch left off.",
    form: "mediaBackfill",
    run: async (input) => {
      const parsed = mediaBackfillInputSchema.parse(input ?? {});
      const result = await runMediaBackfill(parsed);
      return {
        summary:
          `Processed ${result.processed}, skipped ${result.skipped}, failed ${result.failed}. ` +
          `${result.remaining} remaining.`,
        details: result,
      };
    },
  },
  {
    id: "seed-catalog",
    label: "Seed demo catalog",
    description:
      "Upsert the demo catalog, content, and store settings used to populate a fresh " +
      "environment. Replaces the old seed-catalog cron route.",
    form: "none",
    run: async () => {
      const result = await seedDemoCatalog();
      return {
        summary: `Seeded ${result.categories} categories, ${result.brands} brands, ${result.products} products.`,
        details: result,
      };
    },
  },
  {
    id: "payment-reconciliation",
    label: "Reconcile payments",
    description:
      "Sweeps every Payment row for an amount mismatch against its order, a refund total " +
      "exceeding what was paid, or more than one PAID payment on the same order. Checks " +
      "what's already in the database — not a live call to any gateway's own transaction " +
      "API (see ADR 0018). Intended to run daily.",
    form: "none",
    run: async () => {
      const { checked, mismatches } = await reconcilePayments();
      if (mismatches.length > 0) {
        await alertPaymentMismatch(mismatches.length);
      }
      return {
        summary:
          mismatches.length === 0
            ? `Checked ${checked} payments. No mismatches found.`
            : `Checked ${checked} payments. Found ${mismatches.length} mismatch(es) — see details.`,
        details: { checked, mismatches },
      };
    },
  },
  {
    id: "abandoned-cart-email",
    label: "Email abandoned carts",
    description:
      "Finds carts left untouched for 2 hours to 7 days with an email on file and sends a " +
      "reminder, once per cart per time it goes quiet. Intended to run daily.",
    form: "none",
    run: async () => {
      const { checked, queued } = await sendAbandonedCartEmails();
      return {
        summary: `Checked ${checked} active carts. Emailed ${queued}.`,
        details: { checked, queued },
      };
    },
  },
  {
    id: "retry-conversions",
    label: "Retry failed Meta/TikTok events",
    description:
      "Retries every Conversions API send still marked failed (bad/expired token, a " +
      "transient Graph/TikTok API outage), capped at 5 attempts each. Intended to run " +
      "daily.",
    form: "none",
    run: async () => {
      const { retried, fixed } = await retryFailedConversions();
      return {
        summary:
          retried === 0
            ? "No failed conversion events to retry."
            : `Retried ${retried}, ${fixed} now sent.`,
        details: { retried, fixed },
      };
    },
  },
  {
    id: "bootstrap-admin",
    label: "Bootstrap admin account",
    description:
      "Seed roles/permissions/role-grants and upsert one admin login. Replaces the old " +
      "bootstrap-admin cron route.",
    form: "bootstrapAdmin",
    run: async (input) => {
      const parsed = bootstrapAdminInputSchema.parse(input ?? {});
      const result = await bootstrapAdminAccount(parsed);
      return { summary: `Admin account ready: ${result.phone}.`, details: result };
    },
  },
];

export function getMaintenanceJob(jobId: string): MaintenanceJob | undefined {
  return maintenanceJobs.find((job) => job.id === jobId);
}

export async function runMaintenanceJob(
  jobId: string,
  triggeredByUserId: string,
  input: unknown,
): Promise<MaintenanceJobResult> {
  const job = getMaintenanceJob(jobId);
  if (!job) {
    throw new Error(`Unknown maintenance job: ${jobId}`);
  }
  const runId = await startRun(jobId, triggeredByUserId);
  try {
    const result = await job.run(input);
    await finishRun(runId, "SUCCESS", {
      summary: result.summary,
      ...(result.details ? { details: result.details } : {}),
    });
    await recordAudit({
      actorId: triggeredByUserId,
      action: `maintenance.${jobId}`,
      entityType: "MaintenanceJobRun",
      entityId: runId,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    await finishRun(runId, "FAILED", { summary: message });
    await recordAudit({
      actorId: triggeredByUserId,
      action: `maintenance.${jobId}.failed`,
      entityType: "MaintenanceJobRun",
      entityId: runId,
    });
    throw error;
  }
}
