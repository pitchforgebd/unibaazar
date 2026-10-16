import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { ImportForm } from "@/components/admin/catalog/ImportForm";
import { catalogAccess } from "@/server/admin/access";

export const metadata: Metadata = { title: "Import products" };

export default async function ImportProductsPage() {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  return <ImportForm />;
}
