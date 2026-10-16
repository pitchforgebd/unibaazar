import { trackEventSchema } from "@/lib/validation/admin-tracking";
import { ApiError, handle, readJson } from "@/server/http";
import { clientIp } from "@/server/security/guard";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimit } from "@/server/security/rate-limit";
import { recordTrackEvent } from "@/server/tracking/signals";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    rateLimit(`track:${clientIp(request)}`, 60, 60 * 1000);
    const parsed = trackEventSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the event");
    }
    await recordTrackEvent({
      name: parsed.data.name,
      eventId: parsed.data.eventId,
      source: "browser",
      payload: parsed.data.payload,
    });
    return { ok: true };
  });
}
