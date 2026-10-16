import type { Metadata } from "next";
import { CourierWebhookPanel } from "@/components/admin/settings/CourierWebhookPanel";
import { IntegrationBoard } from "@/components/admin/settings/IntegrationBoard";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadIntegrations } from "@/server/settings/store";
import { siteOrigin } from "@/server/tracking/config";
import {
  loadCourierWebhookHealth,
  loadCourierWebhookToken,
} from "@/server/courier/webhook";

export const metadata: Metadata = { title: "Gateways" };

export default async function IntegrationSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const [values, token, health] = await Promise.all([
    loadIntegrations(),
    loadCourierWebhookToken(),
    loadCourierWebhookHealth(),
  ]);
  return (
    <div className="space-y-4">
      <SettingsNav />
      <IntegrationBoard values={values} />
      <CourierWebhookPanel
        webhookUrl={`${siteOrigin()}/api/webhooks/steadfast`}
        token={token}
        health={health}
      />
    </div>
  );
}
