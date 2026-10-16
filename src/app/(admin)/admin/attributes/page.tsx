import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { AttributeManager } from "@/components/admin/catalog/CatalogRecords";
import type { AttributeFormValues } from "@/lib/validation/admin-catalog";
import { catalogAccess } from "@/server/admin/access";
import { listAttributes, loadAttribute } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Attributes" };

const emptyAttribute: AttributeFormValues = {
  id: "",
  name: "",
  slug: "",
  style: "BUTTON",
};

type AttributesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttributesPage({ searchParams }: AttributesPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [rows, editing] = await Promise.all([
    listAttributes(),
    id ? loadAttribute(id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Attributes</h1>
      <AttributeManager rows={rows} editing={editing ?? emptyAttribute} />
    </div>
  );
}
