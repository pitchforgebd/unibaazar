import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/media/uploadLimits";

type ImageKind = "png" | "jpeg" | "webp" | "gif";

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function sniff(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "jpeg";
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return "gif";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

function trimPng(bytes: Uint8Array): Uint8Array {
  const iend = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
  for (let index = 0; index <= bytes.length - iend.length; index += 1) {
    if (iend.every((value, offset) => bytes[index + offset] === value)) {
      return bytes.slice(0, index + iend.length);
    }
  }
  throw new Error("The PNG file is incomplete");
}

function trimJpeg(bytes: Uint8Array): Uint8Array {
  for (let index = bytes.length - 2; index > 2; index -= 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) {
      return bytes.slice(0, index + 2);
    }
  }
  throw new Error("The JPEG file is incomplete");
}

function trimWebp(bytes: Uint8Array): Uint8Array {
  const size = bytes[4]! + (bytes[5]! << 8) + (bytes[6]! << 16) + (bytes[7]! << 24);
  const end = size + 8;
  if (end < 12 || end > bytes.length) {
    throw new Error("The WEBP file is incomplete");
  }
  return bytes.slice(0, end);
}

export function reencodeImage(bytes: Uint8Array, declaredType: string): Uint8Array {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be under ${MAX_UPLOAD_MB} MB`);
  }
  const kind = sniff(bytes);
  if (!kind) {
    throw new Error("Upload a PNG, JPEG, WEBP, or GIF");
  }
  if (
    declaredType &&
    !declaredType.toLowerCase().includes(kind === "jpeg" ? "jpeg" : kind) &&
    !(kind === "jpeg" && declaredType.toLowerCase().includes("jpg"))
  ) {
    throw new Error("The file type does not match its contents");
  }
  if (kind === "png") {
    return trimPng(bytes);
  }
  if (kind === "jpeg") {
    return trimJpeg(bytes);
  }
  if (kind === "webp") {
    return trimWebp(bytes);
  }
  return bytes.slice();
}
