"use client";

/**
 * Reads the `_fbp`/`_fbc` cookies the Meta Pixel script itself sets once
 * loaded (`_fbp` on every page view, `_fbc` only when a `fbclid` URL
 * param was present) — this is Meta's own first-party identifier, not
 * something this app invents, so there's nothing to capture ourselves
 * beyond reading it at checkout time and carrying it through order
 * placement the same way `lib/tracking/utm.ts` carries UTM params. See
 * docs/decisions/0020-phase-9-scope-facebook-meta-module.md: before this,
 * the CAPI `Purchase` event never included either, which materially
 * weakens its match quality against the browser Pixel event.
 */
// Split from readFbclidCookies() so the parsing itself is unit-testable
// without a DOM (vitest's default environment here is plain node, no
// `document`) — same pure-function/thin-wrapper split this codebase
// already uses for e.g. dashboard.ts's bucketStatusFunnel().
export function parseCookie(cookieString: string, name: string): string | undefined {
  const match = cookieString.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

const clickKey = "unibaazar:click-ids";

type ClickIds = { fbclid?: string; fbclidAt?: number; ttclid?: string };

function readClickIds(): ClickIds {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(clickKey) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as ClickIds) : {};
  } catch {
    return {};
  }
}

/**
 * Keeps ad-click ids from the landing URL. The pixels that would normally pick
 * them up only start after cookie consent, by which point the shopper may have
 * moved on from the URL that carried them.
 */
export function captureClickIds(): void {
  try {
    const search = new URLSearchParams(window.location.search);
    const fbclid = search.get("fbclid")?.slice(0, 200);
    const ttclid = search.get("ttclid")?.slice(0, 200);
    if (!fbclid && !ttclid) {
      return;
    }
    window.localStorage.setItem(
      clickKey,
      JSON.stringify({
        ...readClickIds(),
        ...(fbclid ? { fbclid, fbclidAt: Date.now() } : {}),
        ...(ttclid ? { ttclid } : {}),
      }),
    );
  } catch {
    // storage unavailable — attribution is best-effort
  }
}

export function readAdIdentifiers(): {
  fbp?: string;
  fbc?: string;
  ttp?: string;
  ttclid?: string;
} {
  const clicks = readClickIds();
  const fbp = parseCookie(document.cookie, "_fbp");
  const ttp = parseCookie(document.cookie, "_ttp");
  const fbc =
    parseCookie(document.cookie, "_fbc") ??
    (clicks.fbclid
      ? `fb.1.${clicks.fbclidAt ?? Date.now()}.${clicks.fbclid}`
      : undefined);
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(ttp ? { ttp } : {}),
    ...(clicks.ttclid ? { ttclid: clicks.ttclid } : {}),
  };
}
