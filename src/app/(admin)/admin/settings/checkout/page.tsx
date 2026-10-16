import type { Metadata } from "next";
import { checkoutAction } from "@/app/(admin)/admin/settings-actions";
import { SettingsDenied } from "@/components/admin/settings/SettingsDenied";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { SettingsNav } from "@/components/admin/settings/SettingsNav";
import { settingsAccess } from "@/server/admin/access";
import { loadCheckout } from "@/server/settings/store";

export const metadata: Metadata = { title: "Checkout settings" };

export default async function CheckoutSettingsPage() {
  const session = await settingsAccess();
  if (!session) {
    return <SettingsDenied />;
  }
  const values = await loadCheckout();
  return (
    <div className="space-y-4">
      <SettingsNav />
      <SettingsForm
        title="Checkout"
        intro="Delivery charges and the free-shipping amount are used when an order is placed. The cart drawer still previews the sample ৳6,500 rule."
        initial={{
          inside: String(values.inside),
          outside: String(values.outside),
          freeFrom: String(values.freeFrom),
          guest: values.guest,
          minOrder: String(values.minOrder),
          cod: values.cod,
          orderPrefix: values.orderPrefix,
        }}
        save={checkoutAction}
        fields={[
          { name: "inside", label: "Inside Dhaka delivery", kind: "number" },
          { name: "outside", label: "Outside Dhaka delivery", kind: "number" },
          { name: "freeFrom", label: "Free shipping from", kind: "number" },
          { name: "minOrder", label: "Minimum order", kind: "number" },
          { name: "orderPrefix", label: "Order ID prefix", kind: "text" },
          { name: "guest", label: "Allow guest checkout", kind: "checkbox" },
          { name: "cod", label: "Allow cash on delivery", kind: "checkbox" },
        ]}
      />
    </div>
  );
}
