import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { PageBoard } from "@/components/admin/content/PageBoard";
import { contentAccess } from "@/server/admin/access";
import { listPages } from "@/server/admin/content";

export const metadata: Metadata = { title: "Pages" };

export default async function ContentPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const rows = await listPages();
  return (
    <div className="space-y-4">
      <ContentNav />
      <PageBoard rows={rows} />
    </div>
  );
}
