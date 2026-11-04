import { relayedTrackNames } from "@/lib/tracking/names";
import { trackEventSchema } from "@/lib/validation/admin-tracking";
import { ApiError, handle, readJson } from "@/server/http";
import { clientIp } from "@/server/security/guard";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimit } from "@/server/security/rate-limit";
import { siteOrigin } from "@/server/tracking/config";
import { recordTrackEvent, sendServerEvent } from "@/server/tracking/signals";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const ip = clientIp(request);
    rateLimit(`track:${ip}`, 60, 60 * 1000);
    const parsed = trackEventSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the event");
    }
    const { name, eventId, payload, relay } = parsed.data;
    await recordTrackEvent({ name, eventId, source: "browser", payload });
    if (relay && relayedTrackNames.includes(name)) {
      const { url, items, value, currency, searchTerm, ...identifiers } = relay;
      // Not awaited: the browser's beacon shouldn't wait on Meta or TikTok.
      void sendServerEvent({
        name,
        eventId,
        url: url.startsWith(siteOrigin()) ? url : siteOrigin(),
        data: { items, value, currency, searchTerm },
        user: {
          ...identifiers,
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      }).catch(() => undefined);
    }
    return { ok: true };
  });
}
