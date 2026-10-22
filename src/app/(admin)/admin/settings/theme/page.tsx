import type { Metadata } from "next";
import { themeAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { ThemePresetPicker } from "@/components/admin/settings/ThemePresetPicker";
import { settingsAccess } from "@/server/admin/access";
import { loadTheme } from "@/server/settings/store";

export const metadata: Metadata = { title: "Theme" };

export default async function ThemeSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadTheme();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <ThemePresetPicker current={values} action={themeAction} />
      <SettingsForm
        key={values.presetId}
        title="Top bar & chat"
        intro="The top bar uses this color — separate from the theme preset above. Hide the top bar or the chat buttons without removing them from the code."
        initial={values}
        save={themeAction}
        fields={[
          { name: "primary", label: "Top bar color", kind: "text" },
          {
            name: "font",
            label: "Font",
            kind: "select",
            options: [
              { value: "poppins", label: "Poppins" },
              { value: "system", label: "System" },
            ],
          },
          { name: "showTopBar", label: "Show top bar", kind: "checkbox" },
          { name: "showChat", label: "Show chat buttons", kind: "checkbox" },
        ]}
      />
    </div>
  );
}
