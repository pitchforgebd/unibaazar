import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { CategoryManager } from "@/components/admin/catalog/CatalogRecords";
import type { CategoryFormValues } from "@/lib/validation/admin-catalog";
import { catalogAccess } from "@/server/admin/access";
import { listCategories, loadCategory } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Categories" };

const emptyCategory: CategoryFormValues = {
  id: "",
  name: "",
  slug: "",
  parentId: "",
  description: "",
  seoText: "",
  imageHue: "",
  sortOrder: "0",
  isActive: true,
  metaTitle: "",
  metaDescription: "",
  canonical: "",
  ogImage: "",
  focusKeyword: "",
  noIndex: false,
};

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [rows, editing] = await Promise.all([
    listCategories(),
    id ? loadCategory(id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Categories</h1>
      <CategoryManager rows={rows} editing={editing ?? emptyCategory} />
    </div>
  );
}
