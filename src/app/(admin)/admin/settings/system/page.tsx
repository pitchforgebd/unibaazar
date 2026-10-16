import type { Metadata } from "next";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { SystemBoard } from "@/components/admin/settings/SystemBoard";
import { settingsAccess } from "@/server/admin/access";
import { listBackups } from "@/server/admin/settings";
import { loadSystem } from "@/server/settings/store";

export const metadata: Metadata = { title: "System" };

export default async function SystemSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const [values, backups] = await Promise.all([
    loadSystem(),
    Promise.resolve(listBackups()),
  ]);
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SystemBoard values={values} backups={backups} />
    </div>
  );
}
