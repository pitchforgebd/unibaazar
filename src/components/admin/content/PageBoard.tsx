"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  pageAction,
  uploadContentImageAction,
} from "@/app/(admin)/admin/content-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Title</th>
              <th className="px-3 py-3 font-semibold">Slug</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-3 font-semibold text-ink">{row.title}</td>
                <td className="px-3 py-3">{row.slug}</td>
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
        </div>
        <RichTextField
          label="Body"
          value={body}
          onChange={setBody}
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
          description={metaDescription}
          h1={title}
          focusKeyword={focusKeyword}
        />
        <Button type="submit" isLoading={pending} loadingLabel="Saving…">
          Save page
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
