import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { ProductForm } from "@/components/admin/catalog/ProductForm";
import { catalogAccess } from "@/server/admin/access";
import { emptyProductForm, loadCatalogOptions } from "@/server/admin/products";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const options = await loadCatalogOptions();
  return (
    <ProductForm
      initial={emptyProductForm(options.brands[0]?.id ?? "")}
      options={options}
    />
  );
}
