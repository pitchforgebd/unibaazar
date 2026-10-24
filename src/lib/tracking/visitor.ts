"use client";

import { parseCookie } from "@/lib/tracking/fbclid";

const cookieName = "ub_visitor";
const maxAgeSeconds = 60 * 60 * 24 * 365 * 2;

/**
 * A client-set, non-httpOnly id purely for counting distinct active
 * visitors in Admin → Analytics' real-time view (TrackingEvent rows
 * within the last few minutes, grouped by this id) — distinct from
 * guard.ts's `ub_device` cookie, which is httpOnly and only set on a
 * write action (login/checkout/otp), not on every page view. Nothing
 * else reads or relies on this value, so it carries no PII and needs
 * no server-side validation beyond the length cap `track()` already
 * applies to every payload field.
 */
export function ensureVisitorId(): string {
  const existing = parseCookie(document.cookie, cookieName);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  document.cookie = `${cookieName}=${id}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
  return id;
}
