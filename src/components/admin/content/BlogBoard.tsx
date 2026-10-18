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
import { buttonClass, fieldClass } from "@/components/ui/controls";

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
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
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
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Name</span>
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Slug</span>
          <input
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass("outline")} disabled={pending}>
            Save category
          </button>
        </div>
      </form>
      <ul className="space-y-1 text-sm text-ink">
        {categories.map((row) => (
          <li key={row.id}>
            {row.name} · {row.slug}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Post</th>
              <th className="px-3 py-3 font-semibold">Author</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{row.title}</p>
                  <p className="text-xs text-muted">{row.category}</p>
                </td>
                <td className="px-3 py-3">{row.authorName}</td>
                <td className="px-3 py-3">
                  {row.status === "PUBLISHED" ? "Published" : "Draft"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
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
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Author</span>
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Category slug</span>
            <input
              value={postCategory}
              onChange={(event) => setPostCategory(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Excerpt</span>
          <input
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            className={fieldClass}
          />
        </label>
        <RichTextField
          label="Content"
          value={content}
          onChange={setContent}
          uploadAction={uploadContentImageAction}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={fieldClass}
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">SEO title</span>
          <input
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">SEO description</span>
          <input
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Canonical path</span>
          <input
            value={canonical}
            onChange={(event) => setCanonical(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">OG image URL</span>
          <input
            value={ogImage}
            onChange={(event) => setOgImage(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Focus keyword</span>
          <input
            value={focusKeyword}
            onChange={(event) => setFocusKeyword(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={noIndex}
            onChange={(event) => setNoIndex(event.target.checked)}
          />
          Hide from search engines
        </label>
        <SeoHints
          title={metaTitle || title}
          description={metaDescription || excerpt}
          h1={title}
          focusKeyword={focusKeyword}
        />
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save post
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
