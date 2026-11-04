/** Every storefront event. Client, server and the API schema all read this list. */
export const trackNames = [
  "PageView",
  "ViewItemList",
  "SelectItem",
  "ViewContent",
  "AddToCart",
  "RemoveFromCart",
  "ViewCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddShippingInfo",
  "AddPaymentInfo",
  "Purchase",
  "Search",
  "CompleteRegistration",
  "Login",
  "Lead",
] as const;

export type TrackName = (typeof trackNames)[number];

/**
 * Events also sent from the server (Meta Conversions API, TikTok Events API)
 * so an ad blocker doesn't lose them. Purchase is deliberately absent: its
 * value must come from the order itself, never from a browser request, so it
 * is sent by signalPurchase() in src/server/tracking/signals.ts instead.
 */
export const relayedTrackNames: readonly TrackName[] = [
  "ViewContent",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Search",
  "CompleteRegistration",
  "Lead",
];
