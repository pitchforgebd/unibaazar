import type { Metadata } from "next";
import { CouponBoard } from "@/components/admin/marketing/CouponBoard";
import { MarketingDenied } from "@/components/admin/marketing/MarketingDenied";
import { MarketingNav } from "@/components/admin/marketing/MarketingNav";
import { catalogAccess } from "@/server/admin/access";
import { listCoupons } from "@/server/admin/marketing";

export const metadata: Metadata = { title: "Coupons" };

export default async function MarketingPage() {
  const session = await catalogAccess();
  if (!session) {
    return <MarketingDenied />;
  }
  const rows = await listCoupons();
  return (
    <div className="space-y-4">
      <MarketingNav />
      <CouponBoard rows={rows} />
    </div>
  );
}
