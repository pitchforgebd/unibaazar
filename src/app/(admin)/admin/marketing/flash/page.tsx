import type { Metadata } from "next";
import { FlashBoard } from "@/components/admin/marketing/FlashBoard";
import { MarketingDenied } from "@/components/admin/marketing/MarketingDenied";
import { MarketingNav } from "@/components/admin/marketing/MarketingNav";
import { catalogAccess } from "@/server/admin/access";
import { listFlashSales } from "@/server/admin/marketing";

export const metadata: Metadata = { title: "Flash sales" };

export default async function FlashPage() {
  const session = await catalogAccess();
  if (!session) {
    return <MarketingDenied />;
  }
  const rows = await listFlashSales();
  return (
    <div className="space-y-4">
      <MarketingNav />
      <FlashBoard rows={rows} />
    </div>
  );
}
