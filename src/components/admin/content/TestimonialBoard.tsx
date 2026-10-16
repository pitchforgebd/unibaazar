"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTestimonialAction,
  testimonialAction,
} from "@/app/(admin)/admin/content-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type TestimonialRow = {
  id: string;
  name: string;
  quote: string;
  rating: number;
  isActive: boolean;
};

const blankForm = { id: "", name: "", quote: "", rating: "5" };

export function TestimonialBoard({ rows }: { rows: TestimonialRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: TestimonialRow) {
    setForm({ id: row.id, name: row.name, quote: row.quote, rating: String(row.rating) });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Testimonials</h1>
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
          <p className="mt-1 text-sm text-muted">{row.quote}</p>
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
        <button type="submit" className={buttonClass()} disabled={pending}>
          {form.id ? "Save changes" : "Save testimonial"}
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
