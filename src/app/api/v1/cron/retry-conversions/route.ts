import { retryFailedConversions } from "@/server/tracking/signals";
import { assertCronSecret } from "@/server/cron/auth";
import { handle } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const { retried, fixed } = await retryFailedConversions();
    return { retried, fixed };
  });
}
