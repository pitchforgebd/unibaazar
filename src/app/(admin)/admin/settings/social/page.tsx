import type { Metadata } from "next";
import Link from "next/link";
import { socialAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadSocial } from "@/server/settings/store";
import { siteOrigin } from "@/server/tracking/config";

export const metadata: Metadata = { title: "Social" };

export default async function SocialSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadSocial();
  const origin = siteOrigin();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SettingsForm
        title="Social"
        intro="Footer icons, chat buttons, social login, homepage embeds, and Facebook catalog sync use these fields. Leave a secret blank to keep the saved value."
        initial={{
          ...values,
          googleClientSecret: "",
          facebookAppSecret: "",
          facebookPageToken: "",
        }}
        save={socialAction}
        fields={[
          { name: "facebook", label: "Facebook page URL", kind: "text" },
          { name: "instagram", label: "Instagram profile URL", kind: "text" },
          { name: "youtube", label: "YouTube channel URL", kind: "text" },
          { name: "whatsapp", label: "WhatsApp link", kind: "text" },
          { name: "messenger", label: "Messenger link", kind: "text" },
          { name: "googleClientId", label: "Google OAuth client ID", kind: "text" },
          {
            name: "googleClientSecret",
            label: "Google OAuth client secret",
            kind: "password",
          },
          { name: "facebookAppId", label: "Facebook app ID", kind: "text" },
          { name: "facebookAppSecret", label: "Facebook app secret", kind: "password" },
          {
            name: "facebookPageToken",
            label: "Facebook page access token",
            kind: "password",
          },
          {
            name: "youtubeHomeVideo",
            label: "Homepage YouTube video URL",
            kind: "text",
          },
          {
            name: "instagramPosts",
            label: "Homepage Instagram post URLs (one per line)",
            kind: "textarea",
          },
          {
            name: "autoPostProducts",
            label: "Auto-post new published products to the Facebook page",
            kind: "checkbox",
          },
        ]}
        extra={
          <section className="rounded-lg bg-card p-4 shadow-soft">
            <h2 className="font-semibold text-ink">Shop catalog feeds</h2>
            <p className="mt-1 text-sm text-muted">
              Connect these feeds in Facebook Catalog / Instagram Shopping and Google
              Merchant. Google and Facebook sign-in callbacks are{" "}
              <code className="text-xs">{origin}/api/v1/auth/oauth/google/callback</code>{" "}
              and{" "}
              <code className="text-xs">
                {origin}/api/v1/auth/oauth/facebook/callback
              </code>
              .
            </p>
            <ul className="mt-3 space-y-1 text-sm">
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
        }
      />
    </div>
  );
}
