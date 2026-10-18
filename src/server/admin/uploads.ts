import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImageVariants, type SourceExtension } from "@/server/media/variants";
import { reencodeImage } from "@/server/security/images";

function extension(bytes: Uint8Array): SourceExtension {
  if (bytes[0] === 0x89) {
    return "png";
  }
  if (bytes[0] === 0xff) {
    return "jpg";
  }
  if (bytes[0] === 0x47) {
    return "gif";
  }
  return "webp";
}

export function uploadsDirectory(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * The single entry point every image upload goes through (product images,
 * content/blog images, rich-text inline images, settings logo/favicon).
 *
 * Returns the URL of the re-encoded *original* (unresized) file, exactly as
 * before — every existing caller stores this single string and expects it
 * to keep working on its own, so that contract never changes.
 *
 * On top of that unchanged contract, this also generates a fixed grid of
 * resized AVIF/WebP variants alongside the original (see
 * `src/server/media/variants.ts` for the naming scheme, sizing, and the
 * non-negotiable `sharp.concurrency(1)` constraint). Those variants are
 * what the custom `next/image` loader (`src/lib/media/imageLoader.ts`)
 * serves; the original returned here remains the fallback for anything
 * that renders the URL directly (emails, `<picture>` fallbacks, non-Image
 * contexts) and for animated GIFs, which are never resized (see
 * `generateImageVariants`).
 */
export async function storeCatalogImage(
  bytes: Uint8Array,
  declaredType: string,
): Promise<string> {
  const cleaned = reencodeImage(bytes, declaredType);
  const ext = extension(cleaned);
  const name = `${crypto.randomUUID()}.${ext}`;
  const directory = uploadsDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), cleaned);
  const url = `/uploads/${name}`;
  await generateImageVariants(cleaned, url, directory, ext);
  return url;
}
