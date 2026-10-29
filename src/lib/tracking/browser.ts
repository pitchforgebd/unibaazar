"use client";

export const trackNames = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Search",
  "CompleteRegistration",
  "Lead",
] as const;

export type TrackName = (typeof trackNames)[number];

export type ConsentCategory = "analytics" | "marketing";

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
};

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
};

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: Gtag;
    ttq?: {
      track: (
        name: string,
        payload?: Record<string, unknown>,
        options?: { event_id: string },
      ) => void;
      page: () => void;
    };
    pintrk?: (command: string, event: string, payload?: Record<string, unknown>) => void;
    snaptr?: (command: string, event: string, payload?: Record<string, unknown>) => void;
  }
}

// Same storage key Phase 2's binary accept/reject banner used — kept so
// a visitor's prior choice isn't silently discarded by this phase's
// move to categories. A bare "accept"/"reject" string (how every value
// written before this phase looks) is read as opting into both
// categories or neither; only a value this phase writes is the new
// {analytics, marketing} JSON shape.
const consentKey = "unibaazar:cookie";

const ga4Names: Record<TrackName, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  AddToWishlist: "add_to_wishlist",
  InitiateCheckout: "begin_checkout",
  AddPaymentInfo: "add_payment_info",
  Purchase: "purchase",
  Search: "search",
  CompleteRegistration: "sign_up",
  Lead: "generate_lead",
};

const tiktokNames: Record<TrackName, string> = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  AddToWishlist: "AddToWishlist",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "CompletePayment",
  Search: "Search",
  CompleteRegistration: "CompleteRegistration",
  Lead: "Contact",
};

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

/** Any category granted — gates the one thing that isn't itself
 * category-specific (the first-party `/api/v1/tracking` log doubles as
 * both analytics and, via `TrackingEvent`, the audit trail an admin
 * checking "did my ad pixel fire" would look at either way). */
export function hasTrackingConsent(): boolean {
  const consent = readConsent();
  return Boolean(consent?.analytics || consent?.marketing);
}

export function ensureFbq(): void {
  if (window.fbq) {
    return;
  }
  const fbq = function (this: Fbq, ...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }
    fbq.queue.push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
}

let adsConversion: { id: string; label: string } | null = null;

/** Called once by StorePixels when Admin → Settings → Tracking's Google
 * Ads fields are both set — `track()` has no other way to reach that
 * config, since call sites (useAddToCart, CheckoutForm, etc.) don't
 * carry it. GA4's own `purchase` event (already sent below) is a
 * different signal; Google Ads conversion tracking specifically needs
 * this distinct `send_to` event to attribute a sale to an ad click. */
export function setAdsConversionTarget(id: string, label: string): void {
  adsConversion = id && label ? { id, label } : null;
}

export function track(
  name: TrackName,
  payload: Record<string, string | number> = {},
  eventId?: string,
): void {
  const consent = readConsent();
  if (!consent?.analytics && !consent?.marketing) {
    return;
  }
  const id = eventId ?? crypto.randomUUID();
  if (consent.analytics) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: name, event_id: id, ...payload });
    window.gtag?.("event", ga4Names[name], { ...payload, event_id: id });
    if (name === "Purchase" && adsConversion) {
      window.gtag?.("event", "conversion", {
        send_to: `${adsConversion.id}/${adsConversion.label}`,
        value: payload.value,
        currency: payload.currency,
        transaction_id: id,
      });
    }
  }
  if (consent.marketing) {
    window.fbq?.("track", name, payload, { eventID: id });
    window.ttq?.track(tiktokNames[name], payload, { event_id: id });
    if (name === "Purchase") {
      window.pintrk?.("track", "checkout", payload);
      window.snaptr?.("track", "PURCHASE", payload);
    }
  }
  void fetch("/api/v1/tracking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, eventId: id, payload }),
    keepalive: true,
  }).catch(() => undefined);
}
