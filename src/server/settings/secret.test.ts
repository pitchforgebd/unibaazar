import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/server/settings/secret";

const testKey = "0152098de6c360c7d52575971e1edae428f7f059cb58acd65ebb16e43b9bc534";

describe("encryptSecret / decryptSecret", () => {
  const original = process.env.SETTINGS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = testKey;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
    } else {
      process.env.SETTINGS_ENCRYPTION_KEY = original;
    }
  });

  it("round-trips a plaintext value through encryption and decryption", () => {
    const plaintext = "sk_live_super-secret-bkash-key";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext because the IV is random", () => {
    const plaintext = "sk_live_super-secret-bkash-key";
    const first = encryptSecret(plaintext);
    const second = encryptSecret(plaintext);
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe(plaintext);
    expect(decryptSecret(second)).toBe(plaintext);
  });

  it("returns a legacy plaintext value unchanged instead of failing to decrypt it", () => {
    const legacyPlaintext = "0170000000-stored-before-encryption-existed";
    expect(decryptSecret(legacyPlaintext)).toBe(legacyPlaintext);
  });

  it("throws clearly when SETTINGS_ENCRYPTION_KEY is missing", () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    expect(() => encryptSecret("anything")).toThrowError(
      "SETTINGS_ENCRYPTION_KEY is required",
    );
  });

  it("throws clearly when SETTINGS_ENCRYPTION_KEY is not a 32-byte hex string", () => {
    process.env.SETTINGS_ENCRYPTION_KEY = "too-short";
    expect(() => encryptSecret("anything")).toThrowError(
      "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string",
    );
  });
});
