"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTestimonialAction,
  testimonialAction,
} from "@/app/(admin)/admin/content-actions";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

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
      {rows.map((row) => (
        <article key={row.id} className="rounded-lg bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-ink">
              {row.name} · {row.rating}/5
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => edit(row)}
              >
                Edit
              </button>
              <DeleteButton
                action={() => deleteTestimonialAction({ id: row.id })}
                confirmText={`Delete testimonial from ${row.name}?`}
              />
            </div>
          </div>
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt="" className="mt-2 h-24 rounded object-cover" />
          ) : (
            <p className="mt-1 text-sm text-muted">{row.quote}</p>
          )}
        </article>
      ))}
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
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
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => {
                setForm(blankForm);
                setMessage("");
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Quote</span>
          <textarea
            value={form.quote}
            onChange={(event) => setForm({ ...form, quote: event.target.value })}
            placeholder="Leave blank if you're uploading a screenshot instead"
            className={`${fieldClass} h-24 py-2`}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Rating</span>
          <select
            value={form.rating}
            onChange={(event) => setForm({ ...form, rating: event.target.value })}
            className={fieldClass}
          >
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">
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
            className={fieldClass}
          />
          {uploading ? (
            <span className="mt-1 block text-xs text-muted">Uploading…</span>
          ) : null}
          {form.imageUrl ? (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="" className="h-20 rounded object-cover" />
              <button
                type="button"
                className="text-xs font-semibold text-red-700"
                onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
              >
                Remove image
              </button>
            </div>
          ) : null}
        </label>
        <button type="submit" className={buttonClass()} disabled={pending || uploading}>
          {form.id ? "Save changes" : "Save testimonial"}
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
