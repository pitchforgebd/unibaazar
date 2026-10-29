/**
 * Whether to mark auth cookies `Secure`.
 *
 * Keyed off the configured site URL's scheme rather than `NODE_ENV`,
 * because `npm run start:test` deliberately runs a *production* build
 * over plain `http://127.0.0.1:3100` — and a `Secure` cookie on an
 * insecure origin is stored but never sent by WebKit (Safari/iOS).
 * Chromium and Firefox grant localhost a secure-context exception;
 * WebKit does not. That made every authenticated flow untestable in
 * WebKit, which is exactly what Phase 12's cross-browser gate exists to
 * cover — see docs/decisions/0023-phase-12-scope-hardening.md.
 *
 * Real production sets `NEXT_PUBLIC_SITE_URL=https://unibaazar.com`, so
 * `Secure` stays on there. An unset or malformed value defaults to
 * `true`: the safe direction is to keep the flag, not drop it.
 */
export const secureCookies = !(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith(
  "http://",
);
