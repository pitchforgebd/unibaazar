"use server";

import { revalidatePath } from "next/cache";
import { trackingSchema } from "@/lib/validation/admin-tracking";
import { requireSettings } from "@/server/admin/access";
import { saveTrackingSettings } from "@/server/admin/tracking";
import { actionError, type ActionResult } from "@/server/admin/result";

export async function trackingAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = trackingSchema.parse(input);
    await saveTrackingSettings(session.userId, parsed);
    revalidatePath("/", "layout");
    revalidatePath("/admin/tracking");
    return { ok: true, message: "Tracking settings saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
