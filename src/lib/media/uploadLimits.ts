/** Largest image file the server accepts, after any in-browser shrinking. */
export const MAX_UPLOAD_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Longest side, in px, the admin UI shrinks a photo to before uploading.
 * Comfortably above the largest generated variant (1600px wide, see
 * MEDIA_VARIANT_WIDTHS), so nothing visible is lost — it just stops a 10 MB
 * phone photo from being sent and decoded at full size.
 */
export const UPLOAD_MAX_SIDE = 2000;
