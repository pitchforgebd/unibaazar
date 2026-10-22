import { existsSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { storeCatalogImage, uploadsDirectory } from "@/server/admin/uploads";
import {
  MEDIA_VARIANT_WIDTHS,
  splitUploadUrl,
  variantUrl,
} from "@/lib/media/variantPath";

// A real 1x1 PNG (same fixture style as src/server/security/security.test.ts).
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Minimal GIF header — enough for the magic-byte sniff in reencodeImage,
// which (unlike PNG/JPEG/WEBP) does no further structural trimming for GIF.
const minimalGif = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x3b,
]);

const writtenFiles: string[] = [];

function trackVariants(originalUrl: string): void {
  const directory = uploadsDirectory();
  writtenFiles.push(path.join(directory, path.basename(originalUrl)));
  for (const width of MEDIA_VARIANT_WIDTHS) {
    for (const format of ["avif", "webp"] as const) {
      writtenFiles.push(
        path.join(directory, path.basename(variantUrl(originalUrl, width, format))),
      );
    }
  }
}

afterEach(() => {
  for (const file of writtenFiles.splice(0)) {
    if (existsSync(file)) {
      rmSync(file);
    }
  }
});

describe("sharp.concurrency", () => {
  it("is capped to 1 OS thread by the media module (non-negotiable for the production host's thread ceiling)", () => {
    // variants.ts sets this unconditionally at module load; storeCatalogImage
    // already pulled that module in above, so this reflects real app state.
    expect(sharp.concurrency()).toBe(1);
  });
});

describe("storeCatalogImage", () => {
  it("writes the original plus every AVIF/WEBP variant, using the naming scheme the loader expects", async () => {
    const url = await storeCatalogImage(new Uint8Array(onePixelPng), "image/png");
    trackVariants(url);

    expect(url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const directory = uploadsDirectory();
    expect(existsSync(path.join(directory, path.basename(url)))).toBe(true);

    const split = splitUploadUrl(url);
    expect(split).not.toBeNull();

    for (const width of MEDIA_VARIANT_WIDTHS) {
      for (const format of ["avif", "webp"] as const) {
        const expectedUrl = variantUrl(url, width, format);
        expect(expectedUrl).toBe(`${split!.base}-${width}.${format}`);
        expect(existsSync(path.join(directory, path.basename(expectedUrl)))).toBe(true);
      }
    }
  });

  it("does not upscale: a 1x1 source's variants stay 1x1 instead of being enlarged", async () => {
    const url = await storeCatalogImage(new Uint8Array(onePixelPng), "image/png");
    trackVariants(url);

    const directory = uploadsDirectory();
    const largestWebp = path.join(
      directory,
      path.basename(
        variantUrl(url, MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1], "webp"),
      ),
    );
    // Read into a buffer rather than handing sharp the file path directly —
    // on Windows, sharp can hold the file handle open briefly after a
    // path-based read, which races with this test's own cleanup unlink.
    const metadata = await sharp(await readFile(largestWebp)).metadata();
    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(1);
  });

  it("skips variant generation for animated GIFs, keeping only the re-encoded original", async () => {
    const url = await storeCatalogImage(new Uint8Array(minimalGif), "image/gif");
    const directory = uploadsDirectory();
    writtenFiles.push(path.join(directory, path.basename(url)));

    expect(url).toMatch(/^\/uploads\/[0-9a-f-]+\.gif$/);
    expect(existsSync(path.join(directory, path.basename(url)))).toBe(true);

    for (const width of MEDIA_VARIANT_WIDTHS) {
      for (const format of ["avif", "webp"] as const) {
        const variantPath = path.join(
          directory,
          path.basename(variantUrl(url, width, format)),
        );
        expect(existsSync(variantPath)).toBe(false);
      }
    }
  });
});
