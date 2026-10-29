"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  blogCategoryAction,
  postAction,
  uploadContentImageAction,
} from "@/app/(admin)/admin/content-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type CategoryRow = { id: string; slug: string; name: string };
type PostRow = {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  category: string;
  status: string;
};

export function BlogBoard({
  categories,
  posts,
}: {
  categories: CategoryRow[];
  posts: PostRow[];
}) {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [authorName, setAuthorName] = useState("");
  const [postCategory, setPostCategory] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonical, setCanonical] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Blog</h1>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void blogCategoryAction({ slug: categorySlug, name: categoryName }).then(
            (result) => {
              setMessage(result.message);
              setPending(false);
              if (result.ok) {
                router.refresh();
              }
            },
          );
        }}
      >
        <h2 className="font-semibold text-ink sm:col-span-2">Category</h2>
        <Input
          label="Name"
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
        />
        <Input
          label="Slug"
          value={categorySlug}
          onChange={(event) => setCategorySlug(event.target.value)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" isLoading={pending}>
            Save category
          </Button>
        </div>
      </form>
      <ul className="space-y-1 text-sm text-ink">
        {categories.map((row) => (
          <li key={row.id}>
            {row.name} · {row.slug}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Post</th>
              <th className="px-3 py-3 font-semibold">Author</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((row) => (
              <tr key={row.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{row.title}</p>
                  <p className="text-xs text-muted">{row.category}</p>
                </td>
                <td className="px-3 py-3">{row.authorName}</td>
                <td className="px-3 py-3">
                  <Badge variant={row.status === "PUBLISHED" ? "success" : "default"}>
                    {row.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void postAction({
            slug,
            title,
            excerpt,
            content,
            authorName,
            categorySlug: postCategory,
            status,
            metaTitle,
            metaDescription,
            canonical,
            ogImage,
            focusKeyword,
            noIndex,
          }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold text-ink">Post</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
          <Input
            label="Author"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
          />
          <Input
            label="Category slug"
            value={postCategory}
            onChange={(event) => setPostCategory(event.target.value)}
          />
        </div>
        <Input
          label="Excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
        />
        <RichTextField
          label="Content"
          value={content}
          onChange={setContent}
          uploadAction={uploadContentImageAction}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </Select>
        <Input
          label="SEO title"
          value={metaTitle}
          onChange={(event) => setMetaTitle(event.target.value)}
        />
        <Input
          label="SEO description"
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
        />
        <Input
          label="Canonical path"
          value={canonical}
          onChange={(event) => setCanonical(event.target.value)}
        />
        <Input
          label="OG image URL"
          value={ogImage}
          onChange={(event) => setOgImage(event.target.value)}
        />
        <Input
          label="Focus keyword"
          value={focusKeyword}
          onChange={(event) => setFocusKeyword(event.target.value)}
        />
        <Checkbox
          label="Hide from search engines"
          checked={noIndex}
          onChange={(event) => setNoIndex(event.target.checked)}
        />
        <SeoHints
          title={metaTitle || title}
          description={metaDescription || excerpt}
          h1={title}
          focusKeyword={focusKeyword}
        />
        <Button type="submit" isLoading={pending} loadingLabel="Saving…">
          Save post
        </Button>
        {message ? (
          <p role="status" className="text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
