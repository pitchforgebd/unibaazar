import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";

/** Shared by BannerBoard and SliderBoard — both upload through the same
 * catalog image endpoint (there's no dedicated marketing image uploader). */
export async function uploadMarketingImage(file: File): Promise<string | null> {
  const body = new FormData();
  body.set("file", file);
  const result = await uploadCatalogImageAction(body);
  return result.ok && result.url ? result.url : null;
}
