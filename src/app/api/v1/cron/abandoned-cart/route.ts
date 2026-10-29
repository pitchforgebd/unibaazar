import { sendAbandonedCartEmails } from "@/server/admin/maintenance/abandoned-cart";
import { assertCronSecret } from "@/server/cron/auth";
import { handle } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const { checked, queued } = await sendAbandonedCartEmails();
    return { checked, queued };
  });
}
