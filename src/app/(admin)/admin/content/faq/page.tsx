import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { FaqBoard } from "@/components/admin/content/FaqBoard";
import { contentAccess } from "@/server/admin/access";
import { listFaqs } from "@/server/admin/content";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqAdminPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const rows = await listFaqs();
  return (
    <div className="space-y-4">
      <ContentNav />
      <FaqBoard rows={rows} />
    </div>
  );
}
