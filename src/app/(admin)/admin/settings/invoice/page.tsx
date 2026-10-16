import type { Metadata } from "next";
import { invoiceAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadInvoice } from "@/server/settings/store";

export const metadata: Metadata = { title: "Invoice settings" };

export default async function InvoiceSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadInvoice();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SettingsForm
        title="Invoice"
        intro="New invoices use this prefix. The footer note and VAT rate print on an invoice. VAT is shown as a rate and is not added on top of the order total."
        initial={{
          vatPercent: String(values.vatPercent),
          prefix: values.prefix,
          footer: values.footer,
          signature: values.signature,
        }}
        save={invoiceAction}
        fields={[
          { name: "vatPercent", label: "VAT percent", kind: "number" },
          { name: "prefix", label: "Invoice prefix", kind: "text" },
          { name: "footer", label: "Footer note", kind: "textarea" },
          { name: "signature", label: "Signature name", kind: "text" },
        ]}
      />
    </div>
  );
}
