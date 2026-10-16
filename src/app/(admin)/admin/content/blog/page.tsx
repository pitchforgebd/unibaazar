import type { Metadata } from "next";
import { BlogBoard } from "@/components/admin/content/BlogBoard";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { contentAccess } from "@/server/admin/access";
import { listBlogCategories, listPosts } from "@/server/admin/content";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogAdminPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const [categories, posts] = await Promise.all([listBlogCategories(), listPosts()]);
  return (
    <div className="space-y-4">
      <ContentNav />
      <BlogBoard categories={categories} posts={posts} />
    </div>
  );
}
