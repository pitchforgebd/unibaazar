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

export function readFbclidCookies(): { fbp?: string; fbc?: string } {
  const fbp = parseCookie(document.cookie, "_fbp");
  const fbc = parseCookie(document.cookie, "_fbc");
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}
