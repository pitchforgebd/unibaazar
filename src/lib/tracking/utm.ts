"use client";

const storageKey = "unibaazar:utm";

export type UtmAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
};

const fields: { key: keyof UtmAttribution; query: string }[] = [
  { key: "utmSource", query: "utm_source" },
  { key: "utmMedium", query: "utm_medium" },
  { key: "utmCampaign", query: "utm_campaign" },
  { key: "utmTerm", query: "utm_term" },
  { key: "utmContent", query: "utm_content" },
];

/**
 * Last-touch attribution: overwrites the stored UTM set whenever a new one
 * is present in the URL, and otherwise leaves the existing value alone so it
 * survives navigation to pages/links that carry no UTM params.
 */
export function captureUtm(): void {
  try {
    const search = new URLSearchParams(window.location.search);
    const found: UtmAttribution = {};
    for (const { key, query } of fields) {
      const value = search.get(query)?.trim().slice(0, 100);
      if (value) {
        found[key] = value;
      }
    }
    if (Object.keys(found).length > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(found));
    }
  } catch {
    // storage unavailable (private mode, blocked, etc.) — attribution is best-effort
  }
}

export function readUtm(): UtmAttribution {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const record = parsed as Record<string, unknown>;
    const result: UtmAttribution = {};
    for (const { key } of fields) {
      const value = record[key];
      if (typeof value === "string" && value) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}
