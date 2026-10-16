import type { Metadata } from "next";
import { CustomerList } from "@/components/admin/customers/CustomerList";
import { CustomersDenied } from "@/components/admin/customers/CustomersDenied";
import { customersAccess } from "@/server/admin/access";
import { listCustomers, parseCustomerListQuery } from "@/server/admin/customers";

export const metadata: Metadata = { title: "Customers" };

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await customersAccess();
  if (!session) {
    return <CustomersDenied />;
  }
  const query = parseCustomerListQuery(await searchParams);
  const list = await listCustomers(query);
  return (
    <CustomerList
      rows={list.rows}
      query={query}
      page={list.page}
      pages={list.pages}
      total={list.total}
    />
  );
}
