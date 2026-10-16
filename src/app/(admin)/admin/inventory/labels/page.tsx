import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { LabelSheets } from "@/components/admin/inventory/LabelSheets";
import { catalogAccess } from "@/server/admin/access";
import { loadLabels } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "Barcode labels" };

type LabelsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LabelsPage({ searchParams }: LabelsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const params = await searchParams;
  const raw = typeof params.ids === "string" ? params.ids : "";
  const labels = raw ? await loadLabels(raw.split(",").filter(Boolean)) : [];
  return <LabelSheets labels={labels} />;
}
