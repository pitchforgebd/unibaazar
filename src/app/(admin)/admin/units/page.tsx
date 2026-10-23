import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { UnitManager } from "@/components/admin/catalog/UnitManager";
import type { UnitFormValues } from "@/lib/validation/admin-catalog";
import { catalogAccess } from "@/server/admin/access";
import { listUnits, loadUnit } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Units" };

const emptyUnit: UnitFormValues = { id: "", name: "", shortName: "" };

type UnitsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UnitsPage({ searchParams }: UnitsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [rows, editing] = await Promise.all([
    listUnits(),
    id ? loadUnit(id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Units</h1>
      <UnitManager rows={rows} editing={editing ?? emptyUnit} />
    </div>
  );
}
