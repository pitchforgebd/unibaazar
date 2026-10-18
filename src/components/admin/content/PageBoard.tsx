"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  pageAction,
  uploadContentImageAction,
} from "@/app/(admin)/admin/content-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type PageRow = { id: string; slug: string; title: string; status: string };

export function PageBoard({ rows }: { rows: PageRow[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("<p></p>");
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
      <h1 className="text-2xl font-bold text-ink">Pages</h1>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Title</th>
              <th className="px-3 py-3 font-semibold">Slug</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3 font-semibold text-ink">{row.title}</td>
                <td className="px-3 py-3">{row.slug}</td>
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
          void pageAction({
            slug,
            title,
            body,
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
        <h2 className="font-semibold text-ink">New or updated page</h2>
        <p className="text-sm text-muted">Saving an existing slug updates that page.</p>
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
        </div>
        <RichTextField
          label="Body"
          value={body}
          onChange={setBody}
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
          description={metaDescription}
          h1={title}
          focusKeyword={focusKeyword}
        />
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save page
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
