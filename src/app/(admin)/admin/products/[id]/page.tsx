import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/common/AdminBreadcrumb";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { ProductForm } from "@/components/admin/catalog/ProductForm";
import { catalogAccess } from "@/server/admin/access";
import { loadCatalogOptions, loadProductForm } from "@/server/admin/products";

export const metadata: Metadata = { title: "Edit product" };

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const { id } = await params;
  const [product, options] = await Promise.all([
    loadProductForm(id),
    loadCatalogOptions(),
  ]);
  if (!product) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <AdminBreadcrumb
        items={[{ label: "Products", href: "/admin/products" }, { label: product.name }]}
      />
      <ProductForm initial={product} options={options} />
    </div>
  );
}
