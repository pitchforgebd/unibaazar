import type { Metadata } from "next";
import { SeoManager } from "@/components/admin/seo/SeoManager";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { settingsAccess } from "@/server/admin/access";
import { listNotFound, listRedirects, robotsDraft } from "@/server/admin/seo";
import { siteOrigin } from "@/server/tracking/config";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const [robots, redirects, misses] = await Promise.all([
    robotsDraft(),
    listRedirects(),
    listNotFound(),
  ]);
  return (
    <SeoManager
      robots={robots}
      redirects={redirects}
      misses={misses}
      origin={siteOrigin()}
    />
  );
}
