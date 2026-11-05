import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { googleHeadScript, gtagScriptUrl } from "@/lib/tracking/googleSnippet";

const none = { gtmId: "", ga4Id: "", adsId: "", adsLabel: "" };

function run(
  script: string,
  stored: string | null,
  layer: "dataLayer" | "ubGtagLayer" = "dataLayer",
) {
  const dataLayer: unknown[] = [];
  const ubGtagLayer: unknown[] = [];
  const first = { parentNode: { insertBefore() {} } };
  const context = {
    dataLayer,
    ubGtagLayer,
    localStorage: { getItem: () => stored },
    document: { createElement: () => ({}), getElementsByTagName: () => [first] },
  };
  runInNewContext(`var window=this;${script}`, context);
  return (layer === "dataLayer" ? dataLayer : ubGtagLayer).map((entry) =>
    typeof entry === "object" && entry !== null && "length" in entry
      ? Array.from(entry as ArrayLike<unknown>)
      : entry,
  );
}

describe("googleHeadScript", () => {
  it("emits nothing when no Google id is configured", () => {
    expect(googleHeadScript(none)).toBe("");
  });

  it("pushes real arguments objects, the only form gtag.js reads", () => {
    const script = googleHeadScript({ ...none, ga4Id: "G-ABC123" });
    expect(script).toContain("function gtmGtag(){dataLayer.push(arguments);}");
    expect(script).toContain("function ubGtag(){ubGtagLayer.push(arguments);}");
  });

  it("sets consent defaults before GTM starts, as Google requires", () => {
    const entries = run(googleHeadScript({ ...none, gtmId: "GTM-KMHZQQ7J" }), null);
    expect(entries[0]).toEqual([
      "consent",
      "default",
      expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" }),
    ]);
    const gtmIndex = entries.findIndex(
      (entry) => (entry as { event?: string }).event === "gtm.js",
    );
    expect(gtmIndex).toBeGreaterThan(0);
  });

  it("restores a saved choice before any tag runs", () => {
    const entries = run(
      googleHeadScript({ ...none, gtmId: "GTM-ABC" }),
      '{"analytics":true,"marketing":false}',
    );
    expect(entries[1]).toEqual([
      "consent",
      "update",
      expect.objectContaining({ analytics_storage: "granted", ad_storage: "denied" }),
    ]);
  });

  it("treats a legacy accept value as both categories, and reject as no update", () => {
    const script = googleHeadScript({ ...none, gtmId: "GTM-ABC" });
    expect(run(script, "accept")[1]).toEqual([
      "consent",
      "update",
      expect.objectContaining({ ad_storage: "granted" }),
    ]);
    expect((run(script, "reject")[1] as string[])[1]).not.toBe("update");
  });

  it("configures GA4 and Ads on their own layer, so GTM never sees their events", () => {
    const script = googleHeadScript({
      gtmId: "GTM-ABC",
      ga4Id: "G-ABC",
      adsId: "AW-123",
      adsLabel: "lbl",
    });
    const own = run(script, null, "ubGtagLayer");
    expect(own).toContainEqual(["config", "G-ABC"]);
    expect(own).toContainEqual(["config", "AW-123"]);
    expect(own[0]).toEqual(["consent", "default", expect.any(Object)]);
    const gtm = run(script, null, "dataLayer");
    expect(gtm).not.toContainEqual(["config", "G-ABC"]);
    expect(gtm[0]).toEqual(["consent", "default", expect.any(Object)]);
  });

  it("escapes values so an id can never close the script tag", () => {
    const script = googleHeadScript({ ...none, adsId: "AW-1", adsLabel: "</script>" });
    expect(script).not.toContain("</script>");
  });
});

describe("gtagScriptUrl", () => {
  it("loads gtag.js for GA4 or Ads, and not for GTM alone", () => {
    expect(gtagScriptUrl({ ...none, gtmId: "GTM-ABC" })).toBeNull();
    expect(gtagScriptUrl({ ...none, ga4Id: "G-ABC" })).toContain(
      "id=G-ABC&l=ubGtagLayer",
    );
    expect(gtagScriptUrl({ ...none, adsId: "AW-1" })).toContain("id=AW-1");
  });
});
