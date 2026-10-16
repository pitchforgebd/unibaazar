import { recordAudit } from "@/server/security/audit";
import {
  saveSecretToken,
  saveTracking,
  type TrackingSettings,
} from "@/server/tracking/config";

export async function saveTrackingSettings(
  actorId: string,
  input: TrackingSettings & { metaToken: string; tiktokToken: string },
): Promise<void> {
  const { metaToken, tiktokToken, ...publicRow } = input;
  await saveTracking(publicRow);
  await saveSecretToken("secret.meta", metaToken);
  await saveSecretToken("secret.tiktok", tiktokToken);
  await recordAudit({
    actorId,
    action: "tracking.save",
    entityType: "Setting",
    entityId: "tracking",
  });
}
