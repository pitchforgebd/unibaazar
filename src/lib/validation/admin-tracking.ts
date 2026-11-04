import { z } from "zod";
import { trackNames } from "@/lib/tracking/names";

function optionalId(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .max(191)
    .refine((value) => value === "" || pattern.test(value), message);
}

function upperId(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .max(191)
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || pattern.test(value), message);
}

// Search Console hands out a whole <meta> tag; the token is all we need.
const searchConsoleToken = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value.match(/content=["']([^"']+)["']/i)?.[1] ?? value)
  .refine(
    (value) => value === "" || /^[\w-]{10,100}$/.test(value),
    "Paste the verification code, or the whole meta tag, from Search Console",
  );

export const trackingSchema = z.object({
  metaPixelId: optionalId(/^\d{5,20}$/, "Enter a numeric Meta pixel ID"),
  metaTestCode: upperId(/^TEST\d{3,10}$/, "Enter a Meta test code like TEST12345"),
  metaToken: z.string().max(500),
  gtmId: upperId(/^GTM-[A-Z0-9]+$/, "Enter a container ID like GTM-ABC123"),
  ga4Id: upperId(/^G-[A-Z0-9]+$/, "Enter a measurement ID like G-ABC123"),
  adsId: upperId(/^AW-\d+$/, "Enter a conversion ID like AW-123"),
  adsLabel: z.string().trim().max(64),
  searchConsole: searchConsoleToken,
  tiktokPixelId: optionalId(/^[A-Z0-9]{10,32}$/i, "Enter a TikTok pixel ID"),
  tiktokTestCode: upperId(/^TEST\d{3,10}$/, "Enter a TikTok test code like TEST12345"),
  tiktokToken: z.string().max(500),
  pinterestId: optionalId(/^\d{5,20}$/, "Enter a numeric Pinterest tag ID"),
  snapId: optionalId(/^[a-f0-9-]{8,64}$/i, "Enter a Snap pixel ID"),
  clarityId: optionalId(/^[a-z0-9]{6,20}$/i, "Enter a Clarity project ID"),
  hotjarId: optionalId(/^\d{5,12}$/, "Enter a numeric Hotjar site ID"),
  customHead: z.string().max(20000, "The head code is too long"),
  customBody: z.string().max(20000, "The body code is too long"),
});

const adIdentifier = z.string().trim().max(255).optional();

export const trackEventSchema = z.object({
  name: z.enum(trackNames),
  eventId: z.string().trim().min(8).max(64),
  payload: z.record(z.union([z.string().max(500), z.number()])).optional(),
  // Present only when the shopper accepted marketing cookies.
  relay: z
    .object({
      url: z.string().trim().max(500),
      items: z
        .array(
          z.object({
            id: z.string().trim().max(191),
            name: z.string().trim().max(191),
            price: z.number().nonnegative(),
            quantity: z.number().int().positive().max(1000),
          }),
        )
        .max(50)
        .optional(),
      value: z.number().nonnegative().optional(),
      currency: z.string().trim().length(3).optional(),
      searchTerm: z.string().trim().max(200).optional(),
      externalId: adIdentifier,
      fbp: adIdentifier,
      fbc: adIdentifier,
      ttp: adIdentifier,
      ttclid: adIdentifier,
    })
    .optional(),
});
