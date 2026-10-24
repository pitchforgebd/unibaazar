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

export function hasTrackingConsent(): boolean {
  return window.localStorage.getItem(consentKey) === "accept";
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

export function track(
  name: TrackName,
  payload: Record<string, string | number> = {},
  eventId?: string,
): void {
  if (!hasTrackingConsent()) {
    return;
  }
  const id = eventId ?? crypto.randomUUID();
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, event_id: id, ...payload });
  window.fbq?.("track", name, payload, { eventID: id });
  window.gtag?.("event", ga4Names[name], { ...payload, event_id: id });
  window.ttq?.track(tiktokNames[name], payload, { event_id: id });
  if (name === "Purchase") {
    window.pintrk?.("track", "checkout", payload);
    window.snaptr?.("track", "PURCHASE", payload);
  }
  void fetch("/api/v1/tracking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, eventId: id, payload }),
    keepalive: true,
  }).catch(() => undefined);
}
