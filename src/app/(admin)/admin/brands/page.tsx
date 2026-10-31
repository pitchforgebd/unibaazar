import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { BrandManager } from "@/components/admin/catalog/BrandManager";
import type { BrandFormValues } from "@/lib/validation/admin-catalog";
import { catalogAccess } from "@/server/admin/access";
import { listBrands, loadBrand } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Brands" };

const emptyBrand: BrandFormValues = {
  id: "",
  name: "",
  slug: "",
  description: "",
  isActive: true,
  metaTitle: "",
  metaDescription: "",
};

type BrandsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [rows, editing] = await Promise.all([
    listBrands(),
    id ? loadBrand(id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Brands</h1>
      <BrandManager
        // Keyed per record: the form copies `editing` into state once, so without
        // a remount, clicking Edit on another row left the old values showing.
        key={editing?.id ?? "new"}
        rows={rows}
        editing={editing ?? emptyBrand}
      />
    </div>
  );
}
