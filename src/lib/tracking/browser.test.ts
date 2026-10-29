import { describe, expect, it } from "vitest";
import { parseConsentValue } from "./browser";

describe("parseConsentValue", () => {
  it("returns null when nothing is stored yet (no decision made)", () => {
    expect(parseConsentValue(null)).toBeNull();
    expect(parseConsentValue("")).toBeNull();
  });

  it("reads the new categorized JSON shape", () => {
    expect(parseConsentValue('{"analytics":true,"marketing":false}')).toEqual({
      analytics: true,
      marketing: false,
    });
  });

  // Back-compat: every value this app wrote before Phase 10's
  // categorized banner is a bare "accept"/"reject" string — a prior
  // visitor's choice shouldn't be silently discarded by this change.
  it("treats a legacy 'accept' string as opting into both categories", () => {
    expect(parseConsentValue("accept")).toEqual({ analytics: true, marketing: true });
  });

  it("treats a legacy 'reject' string as opting into neither category", () => {
    expect(parseConsentValue("reject")).toEqual({ analytics: false, marketing: false });
  });

  it("treats malformed JSON as no decision rather than throwing", () => {
    expect(parseConsentValue("{not json")).toBeNull();
  });

  it("treats a non-object JSON value as no decision", () => {
    expect(parseConsentValue("42")).toBeNull();
  });

  it("defaults a missing category field to false, not undefined", () => {
    expect(parseConsentValue('{"analytics":true}')).toEqual({
      analytics: true,
      marketing: false,
    });
  });
});
