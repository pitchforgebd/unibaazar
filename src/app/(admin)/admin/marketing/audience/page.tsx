import type { Metadata } from "next";
import { AudienceBoard } from "@/components/admin/marketing/AudienceBoard";
import { MarketingDenied } from "@/components/admin/marketing/MarketingDenied";
import { MarketingNav } from "@/components/admin/marketing/MarketingNav";
import { catalogAccess } from "@/server/admin/access";
import { listCampaigns, listRecovery, listSubscribers } from "@/server/admin/marketing";

export const metadata: Metadata = { title: "Audience" };

export default async function AudiencePage() {
  const session = await catalogAccess();
  if (!session) {
    return <MarketingDenied />;
  }
  const [subscribers, campaigns, carts] = await Promise.all([
    listSubscribers(),
    listCampaigns(),
    listRecovery(),
  ]);
  return (
    <div className="space-y-4">
      <MarketingNav />
      <AudienceBoard subscribers={subscribers} campaigns={campaigns} carts={carts} />
    </div>
  );
}
