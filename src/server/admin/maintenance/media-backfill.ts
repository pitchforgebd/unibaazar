import { backfillMediaVariants } from "@/server/media/backfill";

export type MediaBackfillInput = { batchSize?: number };

export async function runMediaBackfill(
  input: MediaBackfillInput,
): Promise<{ processed: number; skipped: number; failed: number; remaining: number }> {
  return backfillMediaVariants(input);
}
