import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { HomeBoard } from "@/components/admin/content/HomeBoard";
import { contentAccess } from "@/server/admin/access";
import { listHomeSections } from "@/server/admin/content";

export const metadata: Metadata = { title: "Homepage" };

export default async function HomeAdminPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const rows = await listHomeSections();
  return (
    <div className="space-y-4">
      <ContentNav />
      <HomeBoard rows={rows} />
    </div>
  );
}
