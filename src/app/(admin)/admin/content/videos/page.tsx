import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { HomeVideoBoard } from "@/components/admin/content/HomeVideoBoard";
import { contentAccess } from "@/server/admin/access";
import { listHomeVideos } from "@/server/admin/content";

export const metadata: Metadata = { title: "Homepage videos" };

export default async function HomeVideosPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const rows = await listHomeVideos();
  return (
    <div className="space-y-4">
      <ContentNav />
      <HomeVideoBoard rows={rows} />
    </div>
  );
}
