import type { Metadata } from "next";
import { alertsAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadAlertSettings } from "@/server/settings/alerts";

export const metadata: Metadata = { title: "Alert settings" };

export default async function NotificationSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadAlertSettings();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SettingsForm
        title="Admin alerts"
        intro="In-dashboard bell, optional email/SMS queues, Telegram bot, and WhatsApp number. Leave the Telegram token blank to keep a saved secret."
        initial={{ ...values, telegramToken: "" }}
        save={alertsAction}
        fields={[
          { name: "inApp", label: "In-dashboard notifications", kind: "checkbox" },
          {
            name: "sound",
            label: "Play a sound for new unread alerts",
            kind: "checkbox",
          },
          {
            name: "lowStock",
            label: "Alert when stock hits the low threshold",
            kind: "checkbox",
          },
          { name: "email", label: "Queue email to the admin address", kind: "checkbox" },
          { name: "sms", label: "Queue SMS to the admin phone", kind: "checkbox" },
          {
            name: "telegram",
            label: "Send Telegram when a bot token is saved",
            kind: "checkbox",
          },
          {
            name: "whatsapp",
            label: "Queue WhatsApp-style SMS to the WhatsApp phone",
            kind: "checkbox",
          },
          { name: "adminEmail", label: "Admin email", kind: "text" },
          { name: "adminPhone", label: "Admin phone", kind: "text" },
          { name: "whatsappPhone", label: "WhatsApp alert phone", kind: "text" },
          { name: "telegramChatId", label: "Telegram chat ID", kind: "text" },
          { name: "telegramToken", label: "Telegram bot token", kind: "password" },
        ]}
      />
    </div>
  );
}
