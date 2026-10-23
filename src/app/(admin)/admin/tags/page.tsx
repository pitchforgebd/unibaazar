import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { TagManager } from "@/components/admin/catalog/TagManager";
import { catalogAccess } from "@/server/admin/access";
import { listTags } from "@/server/admin/taxonomy";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const tags = await listTags();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Tags</h1>
      <TagManager tags={tags} />
    </div>
  );
}
