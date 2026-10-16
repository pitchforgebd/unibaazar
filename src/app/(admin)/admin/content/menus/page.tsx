import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { MenuBoard } from "@/components/admin/content/MenuBoard";
import { contentAccess } from "@/server/admin/access";
import { listMenus } from "@/server/admin/content";

export const metadata: Metadata = { title: "Menus" };

export default async function MenusPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const menus = await listMenus();
  return (
    <div className="space-y-4">
      <ContentNav />
      <MenuBoard menus={menus} />
    </div>
  );
}
