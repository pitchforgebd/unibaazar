"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFaqAction, faqAction } from "@/app/(admin)/admin/content-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type FaqRow = { id: string; question: string; answer: string; isActive: boolean };

const blankForm = { id: "", question: "", answer: "" };

export function FaqBoard({ rows }: { rows: FaqRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: FaqRow) {
    setForm({ id: row.id, question: row.question, answer: row.answer });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">FAQ</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No questions yet. The public FAQ page keeps its sample list until one is saved.
        </p>
      ) : null}
      {rows.map((row) => (
        <article key={row.id} className="rounded-lg bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-ink">{row.question}</h2>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => edit(row)}
              >
                Edit
              </button>
              <DeleteButton
                action={() => deleteFaqAction({ id: row.id })}
                confirmText="Delete this FAQ?"
              />
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">{row.answer}</p>
        </article>
      ))}
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void faqAction(form).then((result) => {
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
          <h2 className="font-semibold text-ink">{form.id ? "Edit FAQ" : "New FAQ"}</h2>
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
          <span className="mb-1 block font-semibold text-ink">Question</span>
          <input
            value={form.question}
            onChange={(event) => setForm({ ...form, question: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Answer</span>
          <textarea
            value={form.answer}
            onChange={(event) => setForm({ ...form, answer: event.target.value })}
            className={`${fieldClass} h-24 py-2`}
          />
        </label>
        <button type="submit" className={buttonClass()} disabled={pending}>
          {form.id ? "Save changes" : "Save FAQ"}
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
