import { alertPaymentMismatch } from "@/server/admin/alerts";
import { reconcilePayments } from "@/server/admin/maintenance/reconcile-payments";
import { assertCronSecret } from "@/server/cron/auth";
import { handle } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const { checked, mismatches } = await reconcilePayments();
    if (mismatches.length > 0) {
      await alertPaymentMismatch(mismatches.length);
    }
    return { checked, mismatches: mismatches.length };
  });
}
