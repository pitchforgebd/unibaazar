import type { Metadata } from "next";
import { generalAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadGeneral } from "@/server/settings/store";

export const metadata: Metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadGeneral();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SettingsForm
        title="General"
        intro="Site name, contact details, and business hours. The footer uses the phone, email, address, and hours."
        initial={values}
        save={generalAction}
        fields={[
          { name: "name", label: "Site name", kind: "text" },
          { name: "description", label: "Description", kind: "textarea" },
          {
            name: "logo",
            label: "Logo",
            kind: "image",
            hint: "Shown in the storefront header and on printed invoices.",
          },
          {
            name: "favicon",
            label: "Favicon",
            kind: "image",
            hint: "Shown as the browser tab icon. A square image works best.",
          },
          { name: "phone", label: "Phone", kind: "text" },
          { name: "email", label: "Email", kind: "text" },
          { name: "address", label: "Address", kind: "text" },
          { name: "hours", label: "Business hours", kind: "text" },
          { name: "currency", label: "Currency", kind: "text" },
          { name: "timezone", label: "Timezone", kind: "text" },
        ]}
      />
    </div>
  );
}
