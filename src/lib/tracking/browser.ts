"use client";

import {
  firstPartyPayload,
  toGa4,
  toMeta,
  toPinterest,
  toSnap,
  toTiktok,
  TRACKING_CURRENCY,
  type TrackData,
} from "@/lib/tracking/ecommerce";
import { readAdIdentifiers } from "@/lib/tracking/fbclid";
import { consentKey } from "@/lib/tracking/consentKey";
import { relayedTrackNames, type TrackName } from "@/lib/tracking/names";
import { readUtm } from "@/lib/tracking/utm";
import { ensureVisitorId } from "@/lib/tracking/visitor";

export type { TrackName } from "@/lib/tracking/names";

export type ConsentCategory = "analytics" | "marketing";

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
};

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    /** Consent commands, sent to both data layers. */
    gtag?: Gtag;
    /** Events for GA4/Ads set directly in admin, on their own data layer. */
    ubGtag?: Gtag;
    /** Set by the head snippet (src/lib/tracking/googleSnippet.ts). */
    __ubGoogle?: { ga4: string; ads: string; adsLabel: string };
  }
}

// Same storage key Phase 2's binary accept/reject banner used — kept so
// a visitor's prior choice isn't silently discarded by this phase's
// move to categories. A bare "accept"/"reject" string (how every value
// written before this phase looks) is read as opting into both
// categories or neither; only a value this phase writes is the new
// {analytics, marketing} JSON shape.

// Split from readConsent() so the parsing itself is unit-testable
// without a DOM (this repo's vitest default is plain node, no
// `window`) — same pure-function/thin-wrapper split lib/tracking/
// fbclid.ts's parseCookie() uses.
export function parseConsentValue(raw: string | null): ConsentCategories | null {
  if (!raw) {
    return null;
  }
  if (raw === "accept") {
    return { analytics: true, marketing: true };
  }
  if (raw === "reject") {
    return { analytics: false, marketing: false };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    return {
      analytics: record.analytics === true,
      marketing: record.marketing === true,
    };
  } catch {
    return null;
  }
}

export function readConsent(): ConsentCategories | null {
  return parseConsentValue(window.localStorage.getItem(consentKey));
}

export function saveConsent(categories: ConsentCategories): void {
  window.localStorage.setItem(consentKey, JSON.stringify(categories));
  window.dispatchEvent(new Event("unibaazar:consent"));
}

export function hasConsentDecision(): boolean {
  return readConsent() !== null;
}

export function hasConsentFor(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

const MAX_DEFERRED = 25;

// Events raised before StorePixels has started the pixels, or before the
// shopper has answered the cookie banner. A product page's ViewContent fires
// from a child effect, ahead of StorePixels' own, so without this every
// full-page load lost its first event.
let deferred: (() => void)[] = [];
let vendorsReady = false;

export function flushTracking(): void {
  vendorsReady = true;
  if (readConsent() === null) {
    return;
  }
  const pending = deferred;
  deferred = [];
  for (const send of pending) {
    send();
  }
}

function sendToGoogle(name: TrackName, data: TrackData, id: string): void {
  const { event, params, ecommerce } = toGa4(name, data);
  window.dataLayer = window.dataLayer ?? [];
  if (ecommerce) {
    // Google's rule for GTM: clear the previous ecommerce object first, or
    // its items leak into this event.
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event,
      event_id: id,
      ecommerce: data.customer ? { ...params, customer: data.customer } : params,
    });
  } else {
    window.dataLayer.push({ event, event_id: id, ...params });
  }
  // Only for IDs set in admin directly. A gtag event would otherwise also
  // reach a GA4 tag inside GTM, counting everything twice. page_view is left
  // to the Google tag: it sends the first one and Enhanced Measurement sends
  // the rest from history changes.
  const google = window.__ubGoogle;
  if (!google || name === "PageView") {
    return;
  }
  if (google.ga4) {
    window.ubGtag?.("event", event, { ...params, event_id: id, send_to: google.ga4 });
  }
  if (name === "Purchase" && google.ads && google.adsLabel) {
    window.ubGtag?.("event", "conversion", {
      send_to: `${google.ads}/${google.adsLabel}`,
      value: params.value,
      currency: params.currency,
      transaction_id: data.transactionId ?? id,
    });
  }
}

function sendToMarketing(name: TrackName, data: TrackData, id: string): void {
  if (name === "PageView") {
    window.fbq?.("track", "PageView", {}, { eventID: id });
    window.ttq?.page();
    window.pintrk?.("page");
    window.snaptr?.("track", "PAGE_VIEW");
    return;
  }
  const meta = toMeta(name, data);
  if (meta) {
    window.fbq?.("track", meta.event, meta.params, { eventID: id });
  }
  const tiktok = toTiktok(name, data);
  if (tiktok) {
    window.ttq?.track(tiktok.event, tiktok.params, { event_id: id });
  }
  const pinterest = toPinterest(name, data, id);
  if (pinterest) {
    window.pintrk?.("track", pinterest.event, pinterest.params);
  }
  const snap = toSnap(name, data, id);
  if (snap) {
    window.snaptr?.("track", snap.event, snap.params);
  }
}

function sendToServer(
  name: TrackName,
  data: TrackData,
  id: string,
  marketing: boolean,
): void {
  const items = data.items?.slice(0, 50).map((item) => ({
    id: item.id,
    name: item.name.slice(0, 191),
    price: item.price,
    quantity: item.quantity,
  }));
  const relay =
    marketing && relayedTrackNames.includes(name)
      ? {
          url: window.location.href.slice(0, 500),
          items,
          value: data.value,
          currency: data.currency ?? TRACKING_CURRENCY,
          searchTerm: data.searchTerm,
          externalId: ensureVisitorId(),
          ...readAdIdentifiers(),
        }
      : undefined;
  const payload =
    name === "PageView"
      ? { ...firstPartyPayload(data), ...readUtm(), visitorId: ensureVisitorId() }
      : firstPartyPayload(data);
  void fetch("/api/v1/tracking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, eventId: id, payload, relay }),
    keepalive: true,
  }).catch(() => undefined);
}

function sendToVendors(name: TrackName, data: TrackData, id: string): void {
  const consent = readConsent();
  if (!consent) {
    return;
  }
  if (consent.marketing) {
    sendToMarketing(name, data, id);
  }
  if (consent.analytics || consent.marketing) {
    sendToServer(name, data, id, consent.marketing);
  }
}

/**
 * The single place storefront code reports an event.
 *
 * Google tags load on every page and adapt to consent mode, so the data layer
 * is fed until a shopper explicitly refuses analytics. Everything else waits
 * for consent: nothing here reaches Meta, TikTok, Pinterest, Snap or our own
 * event log before the shopper has accepted.
 */
export function track(name: TrackName, data: TrackData = {}, eventId?: string): void {
  const id = eventId ?? crypto.randomUUID();
  const consent = readConsent();
  if (consent && !consent.analytics && !consent.marketing) {
    return;
  }
  if (!consent || consent.analytics) {
    sendToGoogle(name, data, id);
  }
  if (consent && vendorsReady) {
    sendToVendors(name, data, id);
    return;
  }
  deferred = [...deferred, () => sendToVendors(name, data, id)].slice(-MAX_DEFERRED);
}
