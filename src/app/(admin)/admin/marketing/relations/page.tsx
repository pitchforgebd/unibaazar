import type { Metadata } from "next";
import { MarketingDenied } from "@/components/admin/marketing/MarketingDenied";
import { MarketingNav } from "@/components/admin/marketing/MarketingNav";
import { RelationBoard } from "@/components/admin/marketing/RelationBoard";
import { catalogAccess } from "@/server/admin/access";
import { listRelations } from "@/server/admin/marketing";

export const metadata: Metadata = { title: "Product rules" };

export default async function RelationsPage() {
  const session = await catalogAccess();
  if (!session) {
    return <MarketingDenied />;
  }
  const rows = await listRelations();
  return (
    <div className="space-y-4">
      <MarketingNav />
      <RelationBoard rows={rows} />
    </div>
  );
}
