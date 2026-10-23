import type { Metadata } from "next";
import { BannerBoard } from "@/components/admin/marketing/BannerBoard";
import { MarketingDenied } from "@/components/admin/marketing/MarketingDenied";
import { MarketingNav } from "@/components/admin/marketing/MarketingNav";
import { SliderBoard } from "@/components/admin/marketing/SliderBoard";
import { catalogAccess } from "@/server/admin/access";
import { listBanners, listSliders } from "@/server/admin/marketing";

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage() {
  const session = await catalogAccess();
  if (!session) {
    return <MarketingDenied />;
  }
  const [banners, sliders] = await Promise.all([listBanners(), listSliders()]);
  return (
    <div className="space-y-4">
      <MarketingNav />
      <BannerBoard banners={banners} />
      <SliderBoard sliders={sliders} />
    </div>
  );
}
