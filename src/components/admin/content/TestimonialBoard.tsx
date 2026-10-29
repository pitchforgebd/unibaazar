"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTestimonialAction,
  testimonialAction,
} from "@/app/(admin)/admin/content-actions";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { controlBase } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

type TestimonialRow = {
  id: string;
  name: string;
  quote: string;
  rating: number;
  imageUrl: string;
  isActive: boolean;
};

const blankForm = { id: "", name: "", quote: "", rating: "5", imageUrl: "" };

async function uploadOne(file: File): Promise<string | null> {
  const body = new FormData();
  body.set("file", file);
  const result = await uploadCatalogImageAction(body);
  return result.ok && result.url ? result.url : null;
}

export function TestimonialBoard({ rows }: { rows: TestimonialRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  function edit(row: TestimonialRow) {
    setForm({
      id: row.id,
      name: row.name,
      quote: row.quote,
      rating: String(row.rating),
      imageUrl: row.imageUrl,
    });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Testimonials</h1>
        <p className="text-sm text-muted">
          Type a quote, or upload a screenshot of a customer message and leave the quote
          blank — the screenshot is shown as-is on the homepage.
        </p>
      </div>
      <Stagger as="ul" className="space-y-3">
        {rows.map((row) => (
          <StaggerItem as="li" key={row.id}>
            <article className="rounded-theme bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">
                  {row.name} · {row.rating}/5
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}>
                    Edit
                  </Button>
                  <DeleteButton
                    action={() => deleteTestimonialAction({ id: row.id })}
                    confirmText={`Delete testimonial from ${row.name}?`}
                  />
                </div>
              </div>
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.imageUrl}
                  alt=""
                  className="mt-2 h-24 rounded-theme object-cover"
                />
              ) : (
                <p className="mt-1 text-sm text-muted">{row.quote}</p>
              )}
            </article>
          </StaggerItem>
        ))}
      </Stagger>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void testimonialAction(form).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setForm(blankForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">
            {form.id ? "Edit testimonial" : "New testimonial"}
          </h2>
          {form.id ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm(blankForm);
                setMessage("");
              }}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Textarea
          label="Quote"
          value={form.quote}
          onChange={(event) => setForm({ ...form, quote: event.target.value })}
          placeholder="Leave blank if you're uploading a screenshot instead"
        />
        <Select
          label="Rating"
          value={form.rating}
          onChange={(event) => setForm({ ...form, rating: event.target.value })}
        >
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </Select>
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-foreground">
            Screenshot (optional, from your inbox)
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              setUploading(true);
              void uploadOne(file).then((url) => {
                setUploading(false);
                if (url) {
                  setForm((current) => ({ ...current, imageUrl: url }));
                }
              });
            }}
            className={cn(
              controlBase,
              "h-11 cursor-pointer px-3 py-2 file:mr-3 file:rounded-theme file:border-0",
              "file:bg-ink/5 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          {uploading ? (
            <span className="block text-xs text-muted">Uploading…</span>
          ) : null}
          {form.imageUrl ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imageUrl}
                alt=""
                className="h-20 rounded-theme object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
              >
                Remove image
              </Button>
            </div>
          ) : null}
        </div>
        <Button type="submit" isLoading={pending || uploading} loadingLabel="Saving…">
          {form.id ? "Save changes" : "Save testimonial"}
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
