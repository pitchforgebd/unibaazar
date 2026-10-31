import { UPLOAD_MAX_SIDE } from "@/lib/media/uploadLimits";

// Browser-only: shrinks a photo before it's uploaded, so a large phone photo
// is sent and decoded as roughly a megabyte instead of 10+.

const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;
const OUTPUT_QUALITY = 0.88;

export function scaledSize(
  width: number,
  height: number,
  maxSide: number = UPLOAD_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }
  const ratio = maxSide / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/** JPEG can't hold transparency, so anything that might have alpha goes to WebP. */
export function shrinkOutputType(sourceType: string): "image/jpeg" | "image/webp" {
  return sourceType === "image/jpeg" || sourceType === "image/jpg"
    ? "image/jpeg"
    : "image/webp";
}

function extensionFor(type: string): string {
  if (type === "image/jpeg") {
    return "jpg";
  }
  return type.split("/")[1] ?? "png";
}

/**
 * Returns a smaller copy of `file` when it's bigger than it needs to be, or
 * `file` itself when it's already small, is a GIF (canvas would drop the
 * animation), or the browser can't decode/re-encode it. Never throws — the
 * worst case is uploading the original, which the server handles anyway.
 */
export async function shrinkForUpload(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") {
    return file;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const target = scaledSize(bitmap.width, bitmap.height);
    if (target.width === bitmap.width && file.size <= SHRINK_ABOVE_BYTES) {
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, shrinkOutputType(file.type), OUTPUT_QUALITY),
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }
    const name = `${file.name.replace(/\.[^.]+$/, "")}.${extensionFor(blob.type)}`;
    return new File([blob], name, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
