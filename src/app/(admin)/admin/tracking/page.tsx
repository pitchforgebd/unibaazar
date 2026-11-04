import type { Metadata } from "next";
import Link from "next/link";
import { trackingAction } from "@/app/(admin)/admin/tracking-actions";
import { Badge } from "@/components/ui/Badge";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { settingsAccess } from "@/server/admin/access";
import {
  loadTracking,
  metaAccessToken,
  siteOrigin,
  tiktokAccessToken,
} from "@/server/tracking/config";
import { listRecentConversions, listRecentEvents } from "@/server/tracking/signals";

export const metadata: Metadata = { title: "Tracking" };

function tokenHint(saved: string, whereToGet: string): string {
  return saved
    ? `Saved, ending in …${saved.slice(-4)}. Leave blank to keep it, or paste a new one to replace it.`
    : whereToGet;
}

export default async function TrackingPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const [values, events, conversions, metaToken, tiktokToken] = await Promise.all([
    loadTracking(),
    listRecentEvents(),
    listRecentConversions(),
    metaAccessToken(),
    tiktokAccessToken(),
  ]);
  const origin = siteOrigin();
  return (
    <div className="space-y-4">
      <SettingsForm
        title="Tracking"
        intro="Google tags load on every page and follow the shopper's cookie choice through Consent Mode. Meta, TikTok, Pinterest, Snap, Clarity and Hotjar load only after the shopper accepts cookies. Browser and server events share one event id, so nothing is counted twice."
        initial={{ ...values, metaToken: "", tiktokToken: "" }}
        save={trackingAction}
        fields={[
          {
            name: "metaPixelId",
            label: "Meta pixel ID",
            kind: "text",
            section: "Meta (Facebook / Instagram)",
            sectionIntro:
              "Powers Meta Pixel and server-side Conversions API events (ViewContent, Purchase, etc.).",
            hint: "From Meta Events Manager → Data sources → your pixel.",
          },
          {
            name: "metaTestCode",
            label: "Meta test event code",
            kind: "text",
            hint: "Optional, like TEST12345. Only while testing: clear it afterwards, because test events don't count towards your ads.",
          },
          {
            name: "metaToken",
            label: "Meta conversions API token",
            kind: "password",
            hint: tokenHint(
              metaToken,
              "Generate in Events Manager → Settings → Conversions API.",
            ),
          },
          {
            name: "gtmId",
            label: "Google Tag Manager ID",
            kind: "text",
            section: "Google",
            sectionIntro:
              "Analytics, Ads conversion tracking, and Search Console verification.",
            hint: "Format GTM-XXXXXXX. Loads the container with Consent Mode and the GA4 ecommerce data layer. See docs/tracking.md for the triggers to create.",
          },
          {
            name: "ga4Id",
            label: "Google Analytics 4 ID",
            kind: "text",
            hint: "Format G-XXXXXXXXXX. Leave this blank if GA4 is set up inside your GTM container, or every event counts twice.",
          },
          {
            name: "adsId",
            label: "Google Ads ID",
            kind: "text",
            hint: "Format AW-XXXXXXXXX, from Google Ads → Tools → Conversions.",
          },
          {
            name: "adsLabel",
            label: "Google Ads conversion label",
            kind: "text",
            hint: "The label shown alongside the conversion ID for a Purchase action.",
          },
          {
            name: "searchConsole",
            label: "Search Console verification",
            kind: "text",
            hint: "Paste the whole meta tag from Search Console's HTML tag method, or just its code.",
          },
          {
            name: "tiktokPixelId",
            label: "TikTok pixel ID",
            kind: "text",
            section: "TikTok, Pinterest, and Snap",
            sectionIntro: "Ad platform pixels for retargeting and conversion tracking.",
            hint: "From TikTok Ads Manager → Assets → Events.",
          },
          {
            name: "tiktokTestCode",
            label: "TikTok test event code",
            kind: "text",
            hint: "Optional, like TEST12345. Only while testing: clear it afterwards.",
          },
          {
            name: "tiktokToken",
            label: "TikTok events API token",
            kind: "password",
            hint: tokenHint(
              tiktokToken,
              "Generate in TikTok Events Manager for server-side events.",
            ),
          },
          {
            name: "pinterestId",
            label: "Pinterest tag ID",
            kind: "text",
            hint: "From Pinterest Ads Manager → Conversion Tags.",
          },
          {
            name: "snapId",
            label: "Snap pixel ID",
            kind: "text",
            hint: "From Snapchat Ads Manager → Events Manager.",
          },
          {
            name: "clarityId",
            label: "Microsoft Clarity ID",
            kind: "text",
            section: "Session recording",
            sectionIntro:
              "Heatmaps and session replay to see how shoppers actually use the site.",
            hint: "From clarity.microsoft.com → Setup.",
          },
          {
            name: "hotjarId",
            label: "Hotjar site ID",
            kind: "text",
            hint: "From Hotjar → Sites & Organizations → Tracking code.",
          },
          {
            name: "customHead",
            label: "Code for <head>",
            kind: "textarea",
            code: true,
            section: "Custom code",
            sectionIntro:
              "For anything without its own field above, like a Facebook domain verification tag. This runs on every storefront page exactly as pasted, without waiting for cookie consent, so only paste code from a source you trust.",
            hint: "meta, link, script, style and noscript tags only. Saved code is checked first, so a broken tag can't take the site down.",
          },
          {
            name: "customBody",
            label: "Code for the start of <body>",
            kind: "textarea",
            code: true,
            hint: "Any HTML, placed right after the opening body tag. No need to paste GTM's noscript here: the GTM ID field adds it.",
          },
        ]}
      />
      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Feeds and sitemap</h2>
        <p className="mt-1 text-sm text-muted">
          Submit the sitemap in Google Search Console. Use the feeds for Facebook Catalog
          and Google Merchant.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <Link className="text-primary" href="/sitemap.xml" prefetch={false}>
              {`${origin}/sitemap.xml`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/feeds/facebook" prefetch={false}>
              {`${origin}/feeds/facebook`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/feeds/google" prefetch={false}>
              {`${origin}/feeds/google`}
            </Link>
          </li>
        </ul>
      </section>
      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Recent events</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No events yet.</p>
        ) : null}
        <ul className="mt-2 space-y-1 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              {event.when} · {event.name}
              {event.source ? ` · ${event.source}` : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Conversions API sends</h2>
        <p className="mt-1 text-sm text-muted">
          Every server-side Meta/TikTok send, and whether it actually went through — a
          failed send retries automatically (Admin → Maintenance, or the daily cron) up to
          5 times.
        </p>
        {conversions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No events yet.</p>
        ) : null}
        <ul className="mt-2 space-y-1 text-sm">
          {conversions.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              <span>
                {row.when} · {row.provider} · {row.eventName}
              </span>
              <Badge variant={row.status === "sent" ? "success" : "accent"}>
                {row.status}
              </Badge>
              {row.attempts > 1 ? (
                <span className="text-muted">× {row.attempts}</span>
              ) : null}
              {row.error ? <span className="text-muted">{row.error}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
