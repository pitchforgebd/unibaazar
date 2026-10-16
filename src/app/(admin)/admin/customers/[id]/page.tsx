import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/common/AdminBreadcrumb";
import { CustomerProfileView } from "@/components/admin/customers/CustomerProfileView";
import { CustomersDenied } from "@/components/admin/customers/CustomersDenied";
import { customersAccess } from "@/server/admin/access";
import { getCustomerProfile } from "@/server/admin/customers";

export const metadata: Metadata = { title: "Customer" };

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerPage({ params }: CustomerPageProps) {
  const session = await customersAccess();
  if (!session) {
    return <CustomersDenied />;
  }
  const { id } = await params;
  const customer = await getCustomerProfile(id);
  if (!customer) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <AdminBreadcrumb
        items={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name },
        ]}
      />
      <CustomerProfileView
        key={`${customer.id}-${customer.blocked}-${customer.tags.join(",")}-${customer.addresses.length}`}
        customer={customer}
      />
    </div>
  );
}
