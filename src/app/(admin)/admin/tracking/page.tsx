import type { Metadata } from "next";
import Link from "next/link";
import { trackingAction } from "@/app/(admin)/admin/tracking-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { settingsAccess } from "@/server/admin/access";
import { loadTracking, siteOrigin } from "@/server/tracking/config";
import { listRecentEvents } from "@/server/tracking/signals";

export const metadata: Metadata = { title: "Tracking" };

export default async function TrackingPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const [values, events] = await Promise.all([loadTracking(), listRecentEvents()]);
  const origin = siteOrigin();
  return (
    <div className="space-y-4">
      <SettingsForm
        title="Tracking"
        intro="Pixels load after a shopper accepts cookies. The same event id is used in the browser and on the server so Meta can deduplicate Purchase. Leave a token blank to keep the saved secret."
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
            hint: "Optional. Use while verifying events in Events Manager's Test Events tab.",
          },
          {
            name: "metaToken",
            label: "Meta conversions API token",
            kind: "password",
            hint: "Generate in Events Manager → Settings → Conversions API.",
          },
          {
            name: "gtmId",
            label: "Google Tag Manager ID",
            kind: "text",
            section: "Google",
            sectionIntro:
              "Analytics, Ads conversion tracking, and Search Console verification.",
            hint: "Format GTM-XXXXXXX, from your GTM container.",
          },
          {
            name: "ga4Id",
            label: "Google Analytics 4 ID",
            kind: "text",
            hint: "Format G-XXXXXXXXXX, from your GA4 property's data stream.",
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
            hint: "The HTML tag verification code from Google Search Console.",
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
            name: "tiktokToken",
            label: "TikTok events API token",
            kind: "password",
            hint: "Generate in TikTok Events Manager for server-side events.",
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
            <Link className="text-primary" href="/sitemap.xml">
              {`${origin}/sitemap.xml`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/feeds/facebook">
              {`${origin}/feeds/facebook`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/feeds/google">
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
    </div>
  );
}
