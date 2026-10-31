import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { shrinkForUpload } from "@/lib/media/prepareUpload";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/media/uploadLimits";
import type { ActionResult } from "@/server/admin/result";

/** Every admin image upload goes through here, so each one is shrunk in the browser first. */
export async function uploadAdminImage(
  file: File,
  action: (formData: FormData) => Promise<ActionResult> = uploadCatalogImageAction,
): Promise<ActionResult> {
  const prepared = await shrinkForUpload(file);
  if (prepared.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `Image must be under ${MAX_UPLOAD_MB} MB` };
  }
  const body = new FormData();
  body.set("file", prepared);
  try {
    return await action(body);
  } catch {
    return { ok: false, message: "Upload failed — check your connection and try again" };
  }
}

export async function uploadAdminImageUrl(file: File): Promise<string | null> {
  const result = await uploadAdminImage(file);
  return result.ok && result.url ? result.url : null;
}
