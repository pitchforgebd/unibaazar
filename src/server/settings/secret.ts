import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const FORMAT_PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  const value = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("SETTINGS_ENCRYPTION_KEY is required");
  }
  const key = Buffer.from(value, "hex");
  if (key.length !== 32) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — generate one with `openssl rand -hex 32`",
    );
  }
  return key;
}

/**
 * Encrypts a secret setting value for storage with AES-256-GCM. Every call
 * uses a fresh random IV, so encrypting the same plaintext twice never
 * produces the same ciphertext. The result is versioned
 * (`enc:v1:<iv>:<authTag>:<ciphertext>`, each part base64) so the scheme can
 * change later without breaking rows already written in this format.
 */
export function encryptSecret(plaintext: string): string {
  const key = encryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    FORMAT_PREFIX + iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a value read from a `Setting` row with `isSecret: true`.
 *
 * Existing rows written before encryption was added are plaintext and don't
 * carry the `enc:v1:` marker — those are returned unchanged (with a warning)
 * rather than treated as an error. This is a read-time migration: a legacy
 * row is only upgraded to the encrypted format the next time it is written,
 * not rewritten here.
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(FORMAT_PREFIX)) {
    if (stored) {
      console.warn(
        "settings: read a legacy plaintext secret value; it will be encrypted the next time it is saved",
      );
    }
    return stored;
  }
  const [ivPart, authTagPart, ciphertextPart] = stored
    .slice(FORMAT_PREFIX.length)
    .split(":");
  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("Stored secret has a malformed encrypted payload");
  }
  const key = encryptionKey();
  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const ciphertext = Buffer.from(ciphertextPart, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export async function loadSecret(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (typeof row?.value !== "string") {
    return "";
  }
  return decryptSecret(row.value);
}
