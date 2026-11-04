import { recordAudit } from "@/server/security/audit";
import { assertBodySnippet, parseHeadSnippet } from "@/server/tracking/snippets";
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
  parseHeadSnippet(publicRow.customHead);
  assertBodySnippet(publicRow.customBody);
  const custom = `${publicRow.customHead}\n${publicRow.customBody}`;
  for (const id of [
    publicRow.gtmId,
    publicRow.ga4Id,
    publicRow.metaPixelId,
    publicRow.tiktokPixelId,
  ]) {
    if (id && custom.includes(id)) {
      throw new Error(
        `${id} is set in its own field and also pasted in the custom code. Remove it from the custom code, or it will load twice and count everything double.`,
      );
    }
  }
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
