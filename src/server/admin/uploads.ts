import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { reencodeImage } from "@/server/security/images";

function extension(bytes: Uint8Array): "png" | "jpg" | "webp" | "gif" {
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

export async function storeCatalogImage(
  bytes: Uint8Array,
  declaredType: string,
): Promise<string> {
  const cleaned = reencodeImage(bytes, declaredType);
  const name = `${crypto.randomUUID()}.${extension(cleaned)}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), cleaned);
  return `/uploads/${name}`;
}
