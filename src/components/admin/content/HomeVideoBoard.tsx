"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteHomeVideoAction,
  homeVideoAction,
} from "@/app/(admin)/admin/content-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type HomeVideoRow = { id: string; title: string; youtubeUrl: string; isActive: boolean };

const blankForm = { id: "", title: "", youtubeUrl: "" };

export function HomeVideoBoard({ rows }: { rows: HomeVideoRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: HomeVideoRow) {
    setForm({ id: row.id, title: row.title, youtubeUrl: row.youtubeUrl });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Homepage videos</h1>
        <p className="text-sm text-muted">
          Shown in a row right under Testimonials on the homepage. The first 4 active
          videos, in this order, are used.
        </p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No videos yet.</p> : null}
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 shadow-soft"
        >
          <div>
            <p className="font-semibold text-ink">{row.title}</p>
            <p className="text-xs text-muted">{row.youtubeUrl}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-primary"
              onClick={() => edit(row)}
            >
              Edit
            </button>
            <DeleteButton
              action={() => deleteHomeVideoAction({ id: row.id })}
              confirmText={`Delete video ${row.title}?`}
            />
          </div>
        </div>
      ))}
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void homeVideoAction(form).then((result) => {
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
            {form.id ? "Edit video" : "New video"}
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
          <span className="mb-1 block font-semibold text-ink">Title</span>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">YouTube link</span>
          <input
            value={form.youtubeUrl}
            onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className={fieldClass}
          />
        </label>
        <button type="submit" className={buttonClass()} disabled={pending}>
          {form.id ? "Save changes" : "Save video"}
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
