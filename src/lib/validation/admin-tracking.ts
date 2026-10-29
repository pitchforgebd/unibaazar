import { z } from "zod";

function optionalId(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .max(191)
    .refine((value) => value === "" || pattern.test(value), message);
}

export const trackingSchema = z.object({
  metaPixelId: optionalId(/^\d{5,20}$/, "Enter a numeric Meta pixel ID"),
  metaTestCode: optionalId(/^TEST\d{3,10}$/i, "Enter a test event code like TEST12345"),
  metaToken: z.string().max(500),
  gtmId: optionalId(/^GTM-[A-Z0-9]+$/, "Enter a container ID like GTM-ABC123"),
  ga4Id: optionalId(/^G-[A-Z0-9]+$/, "Enter a measurement ID like G-ABC123"),
  adsId: optionalId(/^AW-\d+$/, "Enter a conversion ID like AW-123"),
  adsLabel: z.string().trim().max(64),
  searchConsole: z.string().trim().max(191),
  tiktokPixelId: optionalId(/^[A-Z0-9]{10,32}$/i, "Enter a TikTok pixel ID"),
  tiktokToken: z.string().max(500),
  pinterestId: optionalId(/^\d{5,20}$/, "Enter a numeric Pinterest tag ID"),
  snapId: optionalId(/^[a-f0-9-]{8,64}$/i, "Enter a Snap pixel ID"),
  clarityId: optionalId(/^[a-z0-9]{6,20}$/i, "Enter a Clarity project ID"),
  hotjarId: optionalId(/^\d{5,12}$/, "Enter a numeric Hotjar site ID"),
});

export const trackEventSchema = z.object({
  name: z.enum([
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
  ]),
  eventId: z.string().trim().min(8).max(64),
  payload: z.record(z.union([z.string().max(500), z.number()])).optional(),
});
