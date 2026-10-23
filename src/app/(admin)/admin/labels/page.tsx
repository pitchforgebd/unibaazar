import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { LabelManager } from "@/components/admin/catalog/LabelManager";
import type { LabelFormValues } from "@/lib/validation/admin-catalog";
import { catalogAccess } from "@/server/admin/access";
import { listLabels, loadLabel } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Labels" };

const emptyLabel: LabelFormValues = { id: "", name: "", slug: "", kind: "NEW" };

type LabelsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LabelsPage({ searchParams }: LabelsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [rows, editing] = await Promise.all([
    listLabels(),
    id ? loadLabel(id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Labels</h1>
      <LabelManager rows={rows} editing={editing ?? emptyLabel} />
    </div>
  );
}
